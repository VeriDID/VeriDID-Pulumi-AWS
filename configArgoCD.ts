export const configArgoCD = {
    apiVersion: "argoproj.io/v1alpha1",
    kind: "Application",
    metadata: { 
        namespace: "argocd",
        name: "afj-test-argo",
    },
    spec: {
        source: {
            repoURL: "https://github.com/VeriDID/afj-test-k8s-config",
            targetRevision: "HEAD",
            path: "dev",
        },
        destination: {
            server: "https://kubernetes.default.svc",
            namespace: "afj-test-app",
        },
        project: "default",
        syncPolicy: {
            automated: {
                prune: true,
                selfHeal: true,
            },
            syncOptions: [ "CreateNamespace=true" ],
        },
    }
}
