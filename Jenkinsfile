pipeline {
    agent any

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                bat 'npm install'
            }
        }

        stage('Build') {
            steps {
                bat 'npm run build'
            }
        }

        stage('Automated Testing') {
            steps {
                bat 'npm test'
            }
        }

        stage('Docker Build') {
            steps {
                bat 'docker build -t student-task-manager:1.0 .'
            }
        }

        stage('Kubernetes Deploy') {
            steps {
                bat 'kubectl apply -f deployment.yaml'
                bat 'kubectl apply -f service.yaml'
            }
        }

        stage('Verify Deployment') {
            steps {
                bat 'kubectl rollout status deployment/task-manager-deployment --timeout=120s'
                bat 'kubectl get deployments'
                bat 'kubectl get pods'
                bat 'kubectl get services'
            }
        }
    }
}
