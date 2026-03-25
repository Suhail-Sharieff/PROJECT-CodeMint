## Step1
- cd backend
- docker build -t suhailsharieff/codemint:backend
- docker push suhailsharieff/codemint:backend
## Step2
- cd frontend
- docker build -t suhailsharieff/codemint:frontend
- docker push suhailsharieff/codemint:frontend
## Step3
- cd app
- docker compose up -d 