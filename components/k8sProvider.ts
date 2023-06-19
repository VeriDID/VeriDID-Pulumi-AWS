import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

export function createK8sProvider(name: string, cluster: any) {
    const k8sProvider = new k8s.Provider(name, {
        kubeconfig: cluster.kubeconfig,
    }, { dependsOn: [cluster] });

    return k8sProvider;
}
