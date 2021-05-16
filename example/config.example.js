//
// This file configures the domain url that is used by this example
// to connect to the Convergence Server.
//

//
// 1. Make sure you have access to a Convergence Server.  The easiest way
//    is to launch the Docker container:
//
//    docker run --name convergence -p 8000:80 convergencelabs/convergence-omnibus
//
// 2. Rename this file to config.js and modify the below.
//
// 3. Modify the url to match your server, namespace, and domain of the
//    domain you wish to use.
//

const DOMAIN_URL = "http://localhost:8000/api/realtime/convergence/default";
