import * as pulumi from "@pulumi/pulumi";
import * as k8sNetworking from "@pulumi/kubernetes/networking/v1";
import * as k8s from "@pulumi/kubernetes";
import * as aws from "@pulumi/aws";

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




export function getLoadBalancerName(ingress: k8s.networking.v1.Ingress) {
    return pulumi.all([ingress.status.loadBalancer.ingress])
    .apply(([ingressStatus]) => {
        if (ingressStatus && ingressStatus[0] && ingressStatus[0].hostname) {
            const dnsParts = ingressStatus[0].hostname.split('.');
            const lbNameAndId = dnsParts[0].replace('internal-', '');
            const lbNameParts = lbNameAndId.split('-');
            lbNameParts.pop(); 
            const lbName = lbNameParts.join('-'); 
            return lbName;
        }
        throw new Error('Failed to get the load balancer name.');
    });
}


export function getListenerArn(listenerPort: number, loadBalancerArn: string) {

    const loadBalancerListenerARN = pulumi.output(aws.lb.getListener({
        loadBalancerArn: loadBalancerArn,
        port: listenerPort,
    }));

        return loadBalancerListenerARN
}
