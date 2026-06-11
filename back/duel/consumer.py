"""Consumer WebSocket du duel multijoueur temps réel (autoritaire).

État de partie partagé en mémoire (mono-process dev). Le serveur détient les
questions + bonnes réponses, valide chaque réponse, applique les règles de fin
(meilleur score / élimination) et la mort subite.
"""

import asyncio

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer

# Registre des salles en mémoire : challenge_id -> état de partie.
ROOMS = {}


def _get_room(cid):
    room = ROOMS.get(cid)
    if room is None:
        room = {
            "lock": asyncio.Lock(),
            "challenge": None,
            "questions": [],
            "players": {},          # user_id -> {"username","role","score","alive"}
            "connected": set(),     # user_ids connectés
            "current": -1,
            "round_answers": {},     # user_id -> {"choice","correct"}
            "started": False,
            "finished": False,
            "round_token": 0,
            "sudden_death": False,
        }
        ROOMS[cid] = room
    return room


@database_sync_to_async
def _load_challenge(cid):
    from friends.models import Challenge
    try:
        ch = Challenge.objects.select_related("challenger", "opponent").get(id=cid)
    except Challenge.DoesNotExist:
        return None
    return {
        "id": ch.id,
        "challenger_id": ch.challenger_id,
        "opponent_id": ch.opponent_id,
        "challenger_name": ch.challenger.username,
        "opponent_name": ch.opponent.username,
        "num_questions": ch.num_questions or 10,
        "themes": ch.themes or [],
        "types": ch.types or [],
        "difficulty": ch.difficulty or "medium",
        "end_condition": ch.end_condition or "best_score",
        "timer": ch.timer_seconds or 30,
        "status": ch.status,
    }


@database_sync_to_async
def _load_questions(themes, types, difficulty, count):
    from culture.game import select_game_questions
    return select_game_questions(themes or None, types or None, difficulty or None, count)


@database_sync_to_async
def _save_result(cid, challenger_score, opponent_score, winner_id):
    from friends.models import Challenge
    Challenge.objects.filter(id=cid).update(
        status="completed",
        challenger_score=challenger_score,
        opponent_score=opponent_score,
        winner_id=winner_id,
    )


class DuelConsumer(AsyncJsonWebsocketConsumer):

    async def connect(self):
        self.user = self.scope.get("user")
        self.cid = int(self.scope["url_route"]["kwargs"]["challenge_id"])
        self.group = f"duel_{self.cid}"

        if not self.user or not self.user.is_authenticated:
            await self.close(code=4001)
            return

        challenge = await _load_challenge(self.cid)
        if not challenge or self.user.id not in (challenge["challenger_id"], challenge["opponent_id"]):
            await self.close(code=4003)
            return
        if challenge["status"] not in ("accepted", "completed"):
            await self.close(code=4004)
            return

        self.room = _get_room(self.cid)
        self.room["challenge"] = challenge
        role = "challenger" if self.user.id == challenge["challenger_id"] else "opponent"
        self.role = role

        await self.channel_layer.group_add(self.group, self.channel_name)
        await self.accept()

        async with self.room["lock"]:
            self.room["players"].setdefault(
                self.user.id,
                {"username": self.user.username, "role": role, "score": 0, "alive": True},
            )
            self.room["connected"].add(self.user.id)
            both = len(self.room["connected"]) == 2
            already = self.room["started"]

        if not both:
            await self.send_json({"type": "waiting", "message": "En attente de l'adversaire…"})
        elif both and not already:
            await self._start_game()
        else:
            # Reconnexion alors que la partie tourne : renvoyer la question courante.
            await self._resend_current()

    async def disconnect(self, code):
        room = getattr(self, "room", None)
        if not room:
            return
        await self.channel_layer.group_discard(self.group, self.channel_name)
        async with room["lock"]:
            room["connected"].discard(self.user.id)
            in_progress = room["started"] and not room["finished"]
        if in_progress:
            # Abandon : l'autre joueur gagne.
            other_id = self._other_id()
            await self._finish(winner_id=other_id, reason="forfeit")

    # ── Réception des messages client ──────────────────────────────────────────
    async def receive_json(self, content, **kwargs):
        if content.get("action") == "answer":
            await self._handle_answer(content)

    # ── Démarrage ──────────────────────────────────────────────────────────────
    async def _start_game(self):
        ch = self.room["challenge"]
        questions = await _load_questions(ch["themes"], ch["types"], ch["difficulty"], ch["num_questions"])
        async with self.room["lock"]:
            if self.room["started"]:
                return
            if not questions:
                self.room["finished"] = True
            self.room["questions"] = questions
            self.room["started"] = True
            self.room["current"] = -1
        if not questions:
            await self._broadcast({"type": "error", "message": "Aucune question disponible pour ces paramètres."})
            return
        await self._broadcast({
            "type": "start",
            "num_questions": len(questions),
            "end_condition": ch["end_condition"],
            "timer": ch["timer"],
            "challenger": ch["challenger_name"],
            "opponent": ch["opponent_name"],
        })
        await self._next_question()

    async def _next_question(self, sudden_death=False):
        room = self.room
        ch = room["challenge"]
        # On décide sous verrou, mais on déclenche les actions terminales
        # (fin / mort subite) HORS du verrou (asyncio.Lock non réentrant).
        action = None  # None=question | "end_by_score" | "draw"
        token = index = q = None
        async with room["lock"]:
            if room["finished"]:
                return
            if sudden_death:
                room["sudden_death"] = True
            if room["sudden_death"]:
                extra = await _load_questions(ch["themes"], ch["types"], ch["difficulty"], 1)
                if not extra:
                    action = "draw"
                else:
                    room["questions"].append(extra[0])
                    room["current"] = len(room["questions"]) - 1
            else:
                room["current"] += 1
                if room["current"] >= ch["num_questions"]:
                    action = "end_by_score"

            if action is None:
                room["round_answers"] = {}
                room["round_token"] += 1
                token = room["round_token"]
                q = room["questions"][room["current"]]
                index = room["current"]

        if action == "end_by_score":
            await self._end_by_score()
            return
        if action == "draw":
            await self._finish(winner_id=None, reason="draw")
            return

        await self._broadcast({
            "type": "question",
            "index": index,
            "sudden_death": room["sudden_death"],
            "question": {
                "id": q["id"], "question": q["question"],
                "type": q["type"], "options": q["options"],
            },
            "timer": ch["timer"],
        })
        old = room.get("timeout_task")
        if old and not old.done():
            old.cancel()
        room["timeout_task"] = asyncio.create_task(self._round_timeout(token, ch["timer"]))

    async def _round_timeout(self, token, timer):
        await asyncio.sleep(max(1, int(timer)) + 1)
        room = self.room
        async with room["lock"]:
            if room["finished"] or room["round_token"] != token:
                return  # round déjà résolu
            evaluate = True
        if evaluate:
            await self._evaluate_round(timed_out=True)

    # ── Réponses ────────────────────────────────────────────────────────────────
    async def _handle_answer(self, content):
        room = self.room
        ch = room["challenge"]
        async with room["lock"]:
            if room["finished"] or not room["started"]:
                return
            if content.get("index") != room["current"]:
                return  # réponse pour une autre question
            if self.user.id in room["round_answers"]:
                return  # déjà répondu
            q = room["questions"][room["current"]]
            choice = content.get("choice")
            correct = (str(choice).strip().lower() == str(q["answer"]).strip().lower())
            room["round_answers"][self.user.id] = {"choice": choice, "correct": correct}
            if correct:
                room["players"][self.user.id]["score"] += 1
            sudden = room["sudden_death"]
            both_answered = len(room["round_answers"]) == 2

        # Feedback personnel immédiat (clignotement vert/rouge + son côté client).
        await self.send_json({
            "type": "answer_result",
            "index": content.get("index"),
            "correct": correct,
            "correct_answer": q["answer"],
        })

        if sudden:
            if correct:
                await self._finish(winner_id=self.user.id, reason="sudden_death")
            elif both_answered:
                await self._evaluate_round(timed_out=False)
        elif both_answered:
            await self._evaluate_round(timed_out=False)

    async def _evaluate_round(self, timed_out=False):
        room = self.room
        ch = room["challenge"]
        elimination_winner = None  # uid du gagnant si élimination déclenchée
        async with room["lock"]:
            if room["finished"]:
                return
            room["round_token"] += 1  # invalide tout timeout en attente
            players = list(room["players"].items())  # [(uid, info)]
            answers = room["round_answers"]
            scores = {info["username"]: info["score"] for _, info in players}
            index = room["current"]
            sudden = room["sudden_death"]

            if not sudden and ch["end_condition"] == "elimination":
                wrong = [uid for uid, _ in players if not answers.get(uid, {}).get("correct")]
                if len(wrong) == 1:
                    elimination_winner = next(uid for uid, _ in players if uid != wrong[0])

        # Actions hors verrou.
        if elimination_winner is not None:
            await self._finish(winner_id=elimination_winner, reason="elimination")
            return

        await self._broadcast({"type": "round_result", "index": index, "scores": scores})
        await self._next_question(sudden_death=sudden)

    async def _end_by_score(self):
        """Fin des N questions : compare les scores, mort subite si égalité."""
        room = self.room
        players = list(room["players"].items())
        if len(players) < 2:
            await self._finish(winner_id=None, reason="draw")
            return
        (uid_a, a), (uid_b, b) = players
        if a["score"] > b["score"]:
            await self._finish(winner_id=uid_a, reason="best_score")
        elif b["score"] > a["score"]:
            await self._finish(winner_id=uid_b, reason="best_score")
        else:
            await self._broadcast({"type": "sudden_death"})
            await self._next_question(sudden_death=True)

    async def _finish(self, winner_id, reason):
        room = self.room
        async with room["lock"]:
            if room["finished"]:
                return
            room["finished"] = True
            room["round_token"] += 1
            ch = room["challenge"]
            players = room["players"]
            scores = {info["username"]: info["score"] for info in players.values()}
            cscore = next((p["score"] for uid, p in players.items() if uid == ch["challenger_id"]), 0)
            oscore = next((p["score"] for uid, p in players.items() if uid == ch["opponent_id"]), 0)
            winner_name = players.get(winner_id, {}).get("username") if winner_id else None
            timeout_task = room.get("timeout_task")

        if timeout_task and not timeout_task.done():
            timeout_task.cancel()
        await _save_result(self.cid, cscore, oscore, winner_id)
        await self._broadcast({
            "type": "result",
            "reason": reason,
            "winner": winner_name,   # null = égalité
            "scores": scores,
        })

    async def _resend_current(self):
        room = self.room
        if room["current"] < 0 or room["current"] >= len(room["questions"]):
            return
        ch = room["challenge"]
        q = room["questions"][room["current"]]
        await self.send_json({
            "type": "question",
            "index": room["current"],
            "sudden_death": room["sudden_death"],
            "question": {"id": q["id"], "question": q["question"], "type": q["type"], "options": q["options"]},
            "timer": ch["timer"],
        })

    def _other_id(self):
        ch = self.room["challenge"]
        return ch["opponent_id"] if self.user.id == ch["challenger_id"] else ch["challenger_id"]

    # ── Diffusion ────────────────────────────────────────────────────────────────
    async def _broadcast(self, payload):
        await self.channel_layer.group_send(self.group, {"type": "duel_event", "payload": payload})

    async def duel_event(self, event):
        await self.send_json(event["payload"])
