const socksv5 = require("socksv5");
const { XMPPRPCClient, XMPPRPCServer } = require("./xmpp-jsonrpc");
const infopage = require("./infopage");
const { setup_socket, write_to_socket, close_socket } = require("./xmpp_socket_switch");



class Client {

    constructor ({ xmpp: xmppconfig }){
        this._setup_socks5_server();
        this._setup_xmpprpc(xmppconfig);
    }

    _setup_xmpprpc(xmppconfig){
        this.xmpprpc_client = new XMPPRPCClient(xmppconfig);
        this.xmpprpc_server = new XMPPRPCServer(
            xmppconfig, this.xmpprpc_client.client);

        this.xmpprpc_server.addMethod("close", ({id})=>close_socket(this,id));
        this.xmpprpc_server.addMethod("data", (args)=>this._on_data(args));
    }

    _setup_socks5_server(){

        this.server = socksv5.createServer((info, accept, deny)=>{
            if(this.xmpprpc_client.client.status != "online"){
                return deny();
            }

            var socket = accept(true);
            this._on_socket({info, socket});
        });

        this.server.listen(1080, "0.0.0.0", ()=>{
            console.log("Local proxy entry: port 1080");
        });

        this.server.useAuth(socksv5.auth.None());
        
    }

    async _request_newconnection({addr, port}){
        try{
            const result = await this.xmpprpc_client.request("connection", {
                addr: addr,
                port: port,
                proto: "tcp",
            });
            if(result.id){
                return result.id;
            } else {
                throw Error("Connection refused by server.");
            }
        } catch(e){
            console.error("Failed requesting new connection.", e);
        }
    }

    async _on_socket({info, socket}){
        const self = this;
        // register handlers on sockets

        await setup_socket(this, socket, async ()=>{
            try{
                let id = await this._request_newconnection({
                    addr: info.dstAddr,
                    port: info.dstPort,
                    proto: "tcp",
                });
                socket.id = id; // signals success
            } catch(e){
                console.log(
                    `Connection to ${info.dstAddr}:${info.dstPort} refused` +
                    ` by remote server.`);
                return;
            }
        });
    }

    async _on_data({id, data}){ // on data from XMPP
        await write_to_socket(this, id, data);
    }
}

module.exports = Client;
