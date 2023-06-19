// ingress.ts
import * as k8sNetworking from "@pulumi/kubernetes/networking/v1";
import * as k8s from "@pulumi/kubernetes";

export function createIngress(provider: k8s.Provider, argocdApp:k8s.apiextensions.CustomResource) {
    return new k8sNetworking.Ingress("afj-test-ingress-pulumi", {
        metadata: {
            namespace: "afj-test-app",
            annotations: {
                "alb.ingress.kubernetes.io/load-balancer-name": "afj-test-ingress-pulumi",
                "alb.ingress.kubernetes.io/target-type": "ip",
                "alb.ingress.kubernetes.io/scheme": "internal",
                "alb.ingress.kubernetes.io/healthcheck-path": "/"
            },
        },
        spec: {
            ingressClassName: "alb",
            rules: [
                {
                    http: {
                        paths: [
                            {
                                path: "/",
                                pathType: "Prefix",
                                backend: {
                                    service: {
                                        name: "afj-test-service",
                                        port: {
                                            name: "svc-port",
                                        },
                                    },
                                },
                            },
                        ],
                    },
                },
            ],
        },
    }, { provider: provider,dependsOn: [argocdApp] });
}
