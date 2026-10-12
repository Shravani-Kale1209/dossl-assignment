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

        stage('Validate Kubernetes and Prometheus Configuration') {
            steps {
                bat 'docker run --rm -i --entrypoint=promtool prom/prometheus:v3.5.0 check config /dev/stdin < monitoring/prometheus.yml'
                bat 'kubectl apply --dry-run=server -f deployment.yaml'
                bat 'kubectl apply --dry-run=server -f service.yaml'
                bat 'kubectl apply --dry-run=server -k monitoring'
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
                bat 'kubectl rollout status deployment/task-manager-deployment --timeout=120s'
                bat 'kubectl apply -k monitoring'
                bat 'kubectl rollout status deployment/prometheus --timeout=120s'
            }
        }

        stage('Verify Deployment') {
            steps {
                bat 'kubectl rollout status deployment/task-manager-deployment --timeout=120s'
                bat 'kubectl rollout status deployment/prometheus --timeout=120s'
                bat 'kubectl get deployments'
                bat 'kubectl get pods'
                bat 'kubectl get services'
            }
        }
    }
}
