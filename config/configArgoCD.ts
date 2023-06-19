interface ConfigArgoCD {
    apiVersion: string;
    kind: string;
    metadata: { 
        namespace: string,
        name: string,
    },
    spec: {
        source: {
            repoURL: string,
            targetRevision: string,
            path: string,
        },
        destination: {
            server: string,
            namespace: string,
        },
        project: string,
        syncPolicy: {
            automated: {
                prune: boolean,
                selfHeal: boolean,
            },
            syncOptions: string[],
        },
    }
}

export const configArgoCD: ConfigArgoCD = {
    apiVersion: "argoproj.io/v1alpha1",
    kind: "Application",
    metadata: { 
        namespace: "argocd",
        name: "afj-test-argo",
    },
    spec: {
        source: {
            repoURL: "https://github.com/VeriDID/afj-test-pulumi-k8s-config.git",
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
