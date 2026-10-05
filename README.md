# Student Task Manager CI/CD

## Run locally

Install dependencies, build-check the application files, run tests, then start the server on port 3000:

```sh
npm install
npm run build
npm test
npm start
```

Open `http://localhost:3000` while the server is running.

## Docker

Build and run the local image:

```sh
docker build -t student-task-manager:1.0 .
docker run --rm -p 3000:3000 student-task-manager:1.0
```

Open `http://localhost:3000`.

## Local Kubernetes

With Docker Desktop Kubernetes enabled and the image built locally, apply the existing Deployment and Service. The Deployment uses `imagePullPolicy: Never`, and the NodePort is `30080`.

```sh
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
kubectl rollout status deployment/task-manager-deployment --timeout=120s
kubectl get deployments
kubectl get pods
kubectl get services
```

Open `http://localhost:30080` in Docker Desktop.

## Jenkins Pipeline

The root `Jenkinsfile` defines a Declarative Pipeline with Checkout, Install Dependencies, Build, Automated Testing, Docker Build, Kubernetes Deploy, and Verify Deployment stages. Configure a Jenkins Pipeline job to use **Pipeline script from SCM**, select Git, enter the GitHub repository URL and branch, and set the script path to `Jenkinsfile`. For a private repository, configure Jenkins SCM credentials. A Multibranch Pipeline or a GitHub webhook can trigger builds when changes are pushed.

Install the Jenkins Pipeline, Git, and GitHub plugins. For a regular Pipeline job, enable **GitHub hook trigger for GITScm polling** under Build Triggers. Add a GitHub repository webhook pointing to `http(s)://<jenkins-url>/github-webhook/`, with content type `application/json` and push events enabled.

Use a Windows Jenkins agent with Node.js/npm, Docker Desktop, and `kubectl` installed and on `PATH`; Docker must be able to build the local image and `kubectl` must target the local Docker Desktop Kubernetes cluster. The pipeline uses `bat` commands for that agent. Declarative Pipeline stops on a non-zero `npm test` result, so Docker and Kubernetes stages are skipped after a test failure.

To demonstrate a successful run, commit and push the project to the configured GitHub branch, then run the Jenkins job. The Build and Automated Testing stages should succeed and the later stages should build the image, apply both manifests, and report the deployment rollout and Kubernetes resources. A successful local test run prints:

```text
Starting automated tests...
TEST PASSED: app.js exists
TEST PASSED: package.json exists
TEST PASSED: public/index.html exists
All automated tests passed.
```

To demonstrate fail-fast behavior, temporarily add `missing-file-for-demo.txt` to the `tests` array in `test.js`, then commit and push that change to the branch Jenkins builds. Jenkins should fail in Automated Testing with `TEST FAILED: missing-file-for-demo.txt not found`; Docker Build, Kubernetes Deploy, and Verify Deployment should be skipped. Remove the temporary entry from `test.js`, commit and push the restoration, and run Jenkins again to return to a successful pipeline.