import * as aws from "@pulumi/aws";

export function createCognitoUserPool(name: string) {
    const userPool = new aws.cognito.UserPool(name, {
        // Configure your user pool settings here
        autoVerifiedAttributes: ["email"],
    });

    return userPool;
}
