const { XMPPRPCServer, XMPPRPCClient } = require("./xmpp-jsonrpc");
const utils = require("./utils");
const net = require('net');

const { setup_socket, write_to_socket, close_socket } = require("./xmpp_socket_switch");



class Server {

    constructor({ xmpp: xmppconfig }){
        this.sockets = {};

        this._setup_xmpprpc(xmppconfig);
    }


    _setup_xmpprpc(xmppconfig){

        this.xmpprpc_server = new XMPPRPCServer(xmppconfig);

        this.xmpprpc_server.addMethod(
            "connection",
            (args)=>this._on_connection(args)
        );
        this.xmpprpc_server.addMethod("data", (args)=>this._on_data(args));
        this.xmpprpc_server.addMethod("close", ({id})=>close_socket(this,id));

        this.xmpprpc_client = new XMPPRPCClient(
            xmppconfig, this.xmpprpc_server.client);

    }

    async _on_connection(options){
        const { addr, port } = options;
        console.log("new connection request", addr, port);

        const socket = new net.Socket();
        const connection_id = await setup_socket(this, socket, async ()=>{
            // init function of this socket
            try{
                await new Promise((resolve, reject)=>{
                    socket.connect(port, addr, (err, result)=>{
                        if(err) return reject(err);
                        resolve(result);
                    });
                });
                socket.id = utils.uuid(); // signals successful
                console.log(`Connected to ${addr}:${port}`);
            } catch(e){
                console.log("Failed setting up socket.", e);
            }
        });

        if(connection_id){
            return { id: connection_id }; // accepted
        }
    }

    async _on_data({id, data}){ // on data from XMPP
        await write_to_socket(this, id, data);
    }
    


}

module.exports = Server;
