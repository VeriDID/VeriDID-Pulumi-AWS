import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as dotenv from "dotenv";

dotenv.config();

const region = process.env.AWS_REGION;
const cognitoUserPoolID = process.env.AWS_COGNITO_USER_POOL_ID;
const cognitoClientID = process.env.AWS_COGNITO_CLIENT_ID;

if (!cognitoClientID) {
    throw new Error('AWS_COGNITO_CLIENT_ID must be defined in the .env file');
}
if (!region) {
    throw new Error('AWS_REGION must be defined in the .env file');
}
if (!cognitoUserPoolID) {
    throw new Error('AWS_COGNITO_USER_POOL_ID must be defined in the .env file');
}

export const createApiGatewayWithVpcLink = (name: string, loadBalancerListenerARN: string, subnetIdsOutput: pulumi.Output<string[]>, securityGroupIds: pulumi.Output<string>[]) => {
    const api = new aws.apigatewayv2.Api(`${name}-api`, {
        protocolType: "HTTP",
    });

    const vpcLink = new aws.apigatewayv2.VpcLink(`${name}-vpc-link`, {
        subnetIds: subnetIdsOutput,
        securityGroupIds: securityGroupIds,
        tags: {
            "services.k8s.aws/controller-version": "apigatewayv2-v0.1.5",
            "services.k8s.aws/namespace": "afj-test-app"
        }
    });

    const httpIntegration = new aws.apigatewayv2.Integration(`${name}-integration`, {
        apiId: api.id,
        integrationType: "HTTP_PROXY",
        integrationMethod: "ANY",
        integrationUri: loadBalancerListenerARN,
        payloadFormatVersion: "1.0",
        connectionType: "VPC_LINK",
        connectionId: vpcLink.id
    });
    const httpIntegrationId = httpIntegration.id.apply(id => id);

    const authorizer = new aws.apigatewayv2.Authorizer(`${name}-authorizer`, {
        apiId: api.id,
        authorizerType: "JWT",
        identitySources: ["$request.header.Authorization"],
        jwtConfiguration: {
            issuer: `https://cognito-idp.${region}.amazonaws.com/${cognitoUserPoolID}`,
            audiences: [cognitoClientID]
        },
        authorizerResultTtlInSeconds: 0, 
        name: `${name}-authorizer`,
    }, { dependsOn: [httpIntegration] });

    // Define get: / route
    new aws.apigatewayv2.Route(`${name}-route-get-root`, {
        apiId: api.id,
        routeKey: "GET /",
        target: pulumi.interpolate`integrations/${httpIntegrationId}`,
    }, { dependsOn: [httpIntegration] });

    //  // For swagger
    //  new aws.apigatewayv2.Route(`${name}-route-/api`, {
    //     apiId: api.id,
    //     routeKey: "GET /api#",
    //     target: pulumi.interpolate`integrations/${httpIntegrationId}`,
    // },{ dependsOn: [httpIntegration] });

    // Define post: auth/log-in route
    new aws.apigatewayv2.Route(`${name}-route-auth-log-in`, {
        apiId: api.id,
        routeKey: "POST /auth/login",
        target: pulumi.interpolate`integrations/${httpIntegrationId}`,
    },{ dependsOn: [httpIntegration] });

    const logoutRouteAuthorizerId = authorizer.id.apply(id => id);
    const logoutRoute = new aws.apigatewayv2.Route(`${name}-route-auth-log-out`, {
        apiId: api.id,
        routeKey: "POST /auth/logout",
        target: pulumi.interpolate`integrations/${httpIntegrationId}`,
        authorizerId: logoutRouteAuthorizerId,
        authorizationType: 'JWT'
    }, { dependsOn: [authorizer, httpIntegration] });
    
    const deployment = new aws.apigatewayv2.Deployment(`${name}-deployment`, {
        apiId: api.id,
    }, { dependsOn: [httpIntegration, logoutRoute] });


    const stage = new aws.apigatewayv2.Stage(`${name}-stage`, {
        apiId: api.id,
        deploymentId: deployment.id,
        autoDeploy: true,
        name: "$default" 
    });

    return {
        api,
        stage,
    };
}