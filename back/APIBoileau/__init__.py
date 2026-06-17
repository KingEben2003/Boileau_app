import os

if os.getenv("DATABASE_URL", "").startswith("mysql://"):
    import pymysql
    pymysql.install_as_MySQLdb()
