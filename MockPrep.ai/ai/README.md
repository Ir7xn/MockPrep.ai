python -m venv venv
source venv/Scripts/activate   # Windows
# or
source venv/bin/activate       # Linux / Mac



alembic -c migrations/alembic.ini upgrade head


python -m app.main

