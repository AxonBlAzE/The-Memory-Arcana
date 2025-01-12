import { Amplify } from 'aws-amplify';

Amplify.configure({
    Auth: {
        mandatorySignIn: false,
        region: 'us-east-1' // replace with your region
    },
    Storage: {
        region: 'us-east-1', // replace with your region
        bucket: 'thememoryarcanacb372fd242c94d16b2aedc22157b2b1876401-staging', // replace with your bucket name
    }
});