
import { FiFile, FiMoreVertical } from "react-icons/fi";

export default function PdfCard({ pdf }) {
  if (!pdf) return null;

  return (
    <div className="group glass-card p-4 rounded-2xl flex items-center justify-between cursor-pointer">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all">
          <FiFile size={24} />
        </div>
        <div>
          <p className="text-sm font-bold text-white leading-tight group-hover:text-indigo-300 transition-colors">
            {pdf.title}
          </p>
          <p className="text-[11px] text-gray-500 mt-0.5">{pdf.date}</p>
        </div>
      </div>

      <button className="p-2 text-gray-600 hover:text-white transition-colors">
        <FiMoreVertical size={18} />
      </button>
    </div>
  );
}
