const role = process.argv[2];

const config = JSON.parse(require("fs").readFileSync(process.argv[2]));

if(config.allow_insecure_connection){
    console.warn(
        "WARNING: disabling TLS security. Connection is likely insecure.");
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;
}


if(config.role == "client"){
    const Client = require("./client");
    const client = new Client(config);
} else if(config.role == "server"){
    const Server = require("./server");
    const server = new Server(config);
} else {
    console.error("`role` missing in config file.");
}
