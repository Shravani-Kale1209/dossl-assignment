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

The optional `PORT` environment variable changes the HTTP listening port. The
application exposes Prometheus metrics at `http://localhost:3000/metrics`.
Metrics include completed HTTP request counts and latency histograms, plus
Node.js runtime metrics such as `process_resident_memory_bytes`. The scrape
endpoint itself is excluded from request metrics to avoid counting scrapes as
application traffic.

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

To demonstrate a successful run, commit and push the project to the configured GitHub branch, then run the Jenkins job. The Build and Automated Testing stages should succeed and the later stages should build the image, apply the application and monitoring resources, and report both Deployment rollouts and Kubernetes resources. A successful local test run prints:

```text
Starting automated tests...
TEST PASSED: app.js exists
TEST PASSED: metrics.js exists
TEST PASSED: package.json exists
TEST PASSED: monitoring/prometheus.yml exists
TEST PASSED: public/index.html exists
TEST PASSED: /metrics exposes request, latency, and memory metrics
All automated tests passed.
```

To demonstrate fail-fast behavior, temporarily add `missing-file-for-demo.txt` to the `tests` array in `test.js`, then commit and push that change to the branch Jenkins builds. Jenkins should fail in Automated Testing with `TEST FAILED: missing-file-for-demo.txt not found`; Docker Build, Kubernetes Deploy, and Verify Deployment should be skipped. Remove the temporary entry from `test.js`, commit and push the restoration, and run Jenkins again to return to a successful pipeline.

## Prometheus monitoring

`metrics.js` registers HTTP request counters and latency histograms, and
collects the Node.js runtime metrics from `@prometheus-io/client`. Routes are
grouped into a small fixed set (`home`, `static_asset`, and `not_found`) rather
than using raw paths as labels. HTTP status codes and methods are labels.

The Kustomize configuration in `monitoring/` generates a Prometheus ConfigMap
from `monitoring/prometheus.yml` and creates a single-replica Deployment and
internal ClusterIP Service. ConfigMap content is hashed into the Deployment
reference so configuration changes roll out automatically. Prometheus uses the
pinned `prom/prometheus:v3.5.0` image, scrapes every 15 seconds, and retains up
to 7 days of data in pod-local `emptyDir` storage. Data is not retained if the
Prometheus pod is replaced; configure a PVC for environments that need durable
history. The Prometheus UI is not exposed through a NodePort or LoadBalancer.
No additional secrets or environment variables are required. As with the
existing application manifests, resources are applied to the active
`kubectl` context namespace (normally `default`); keep the app and Prometheus
in that same namespace. Prometheus uses Kubernetes endpoint discovery scoped
to its own namespace to scrape each ready endpoint selected by the
`task-manager-service`, rather than sampling one random replica through the
load-balanced Service IP. Its ServiceAccount has read-only `get`, `list`, and
`watch` permissions for only Services, Endpoints, and Pods in that namespace.
An init container renders the active namespace into the Prometheus config before
startup; it uses the pinned `busybox:1.37.0` image.

Apply the app and wait for its readiness probe before applying Prometheus:

```sh
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
kubectl rollout status deployment/task-manager-deployment --timeout=120s
kubectl apply -k monitoring
kubectl rollout status deployment/prometheus --timeout=120s
```

The existing Jenkins pipeline follows this order: it waits for the application
rollout, applies `monitoring/`, and waits for Prometheus. Before deployment it
checks the Prometheus config with `promtool` and server-side dry-runs the
Kubernetes resources. The application readiness probe checks `/metrics`.

Forward the Prometheus Service port to view its UI:

```sh
kubectl port-forward service/prometheus 9090:9090
```

Then open `http://localhost:9090`, select **Status → Targets**, and verify the
`student-task-manager` target is **UP**. In the expression browser, run the
queries below:

| What it shows | PromQL |
| --- | --- |
| All scrape target availability | `up` |
| Student Task Manager availability | `up{job="student-task-manager"}` |
| Total completed HTTP requests since the app started | `sum(http_requests_total{job="student-task-manager"})` |
| HTTP requests per second over the last 5 minutes | `sum(rate(http_requests_total{job="student-task-manager"}[5m]))` |
| HTTP 5xx errors per second | `sum(rate(http_requests_total{job="student-task-manager",status_code=~"5.."}[5m]))` |
| Fraction of requests returning 5xx | `sum(rate(http_requests_total{job="student-task-manager",status_code=~"5.."}[5m])) / sum(rate(http_requests_total{job="student-task-manager"}[5m]))` |
| Average HTTP response latency over 5 minutes | `sum(rate(http_request_duration_seconds_sum{job="student-task-manager"}[5m])) / sum(rate(http_request_duration_seconds_count{job="student-task-manager"}[5m]))` |
| 95th-percentile HTTP response latency | `histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket{job="student-task-manager"}[5m])))` |
| Total application process resident memory across pods in bytes | `sum(process_resident_memory_bytes{job="student-task-manager"})` |

Request counters exclude `/metrics`, and request latency is exposed in seconds.
The histogram includes buckets through 5 seconds; observations above that are
counted in the `+Inf` bucket.

To inspect metrics directly from the application Service:

```sh
kubectl port-forward service/task-manager-service 3000:3000
curl http://localhost:3000/metrics
```

### Troubleshooting a DOWN target

- Confirm both Deployments are ready with
  `kubectl get deployments,pods,services` in the active context namespace.
- Check the app rollout and readiness failures with
  `kubectl describe deployment/task-manager-deployment` and
  `kubectl logs deployment/task-manager-deployment`.
- Check that the Service has ready endpoints using
  `kubectl get endpoints task-manager-service`; an empty endpoint list means
  its selector does not match ready application pods.
- Verify `/metrics` via the application port-forward above. A failed request
  indicates an app or Service issue rather than a Prometheus scrape issue.
- Check Prometheus startup and configuration errors with
  `kubectl logs deployment/prometheus`, and confirm that both workloads are in
  the same namespace. `task-manager-service:3000` resolves only within that
  namespace.
- Reapply `monitoring/` with `kubectl apply -k monitoring` and inspect
  **Status → Targets** again if `monitoring/prometheus.yml` was changed.