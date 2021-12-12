const { escapeXML, escapeXMLText } = require("@xmpp/xml");
const { unescapeXML, unescapeXMLText } = require("@xmpp/xml");
const { client, xml } = require("@xmpp/client");
const events = require("events");
const {
    JSONRPCServer,
    JSONRPCClient,
    JSONRPCServerAndClient,
    JSONRPCErrorResponse
} = require("json-rpc-2.0");

const RPCNS = "http://neoatlantis.org/json-rpc";

const ERR_TIMEOUT = xml("error", { code: 504 }, xml("timeout")); 
const ERR_BADREQUEST = xml("error", { code: 400 }, xml("bad-request"));



function handle_xmpp_error(client){
    client.on("error", async function(e){
        console.error("XMPP client error:", e);
        console.warn("Shutting down XMPP for reconnect.");
        await client.stop();
        while(true){
            try{
                await client.start();
                break;
            } catch(e){
                await new Promise((resolve, reject)=>setTimeout(resolve, 3000));
            }
        }
    });
}



class XMPPRPCServer extends JSONRPCServer {

    constructor (options, client_instance){
        super();
        const self = this;

        if(client_instance){
            this.client = client_instance;
        } else {
            this.client = client({
                service:  options.service,
                username: options.username,
                password: options.password,
                resource: options.resource,
            });
            this.client.start();
        }
        handle_xmpp_error(this.client);
        this.timeout = options.timeout | 30000;

        this.client.iqCallee.set(RPCNS, "query", async (ctx)=>{
            try{
                const jid_from = ctx.from.toString();

                let jsonrpc = null;
                try{
                    jsonrpc = JSON.parse(unescapeXMLText(ctx.element.text()));
                } catch(e){
                    return ERR_BADREQUEST;
                }
                
                let jsonrpc_resp = 
                    await this.receive(jsonrpc, { userID: jid_from });
                let stanza_xml = xml(
                    "query",
                    { xmlns: RPCNS },
                    JSON.stringify(jsonrpc_resp)
                );

                return stanza_xml;
            } catch(e){
                console.error("XMPP query response error", e);
            }
        });

    }
}






class XMPPRPCClient extends JSONRPCClient {

    constructor (options, client_instance){
        super(async function(jsonRPCRequest) {
            try{
                let peer = self.peer;
                if(jsonRPCRequest.$peer){
                    peer = jsonRPCRequest.$peer;
                    delete jsonRPCRequest.$peer;
                }

                const result = await self.client.iqCaller.request(
                    xml("iq", { type: "set", to: peer },
                        xml(
                            "query",
                            { xmlns: RPCNS },
                            escapeXMLText(JSON.stringify(jsonRPCRequest))
                        )
                    )
                );

                try{
                    const result_json = JSON.parse(result.children[0].text());
                    self.receive(result_json);
                } catch(e){
                }
            } catch(e){
                console.error("XMPP request error", e);
            }
        });


        const self = this;

        this.peer = options.peer;

        if(client_instance){
            this.client = client_instance;
        } else {
            this.client = client({
                service:  options.service,
                username: options.username,
                password: options.password,
                resource: options.resource,
            });
            this.client.start();
        }

        // Create a custom error response
        const createTimeoutJSONRPCErrorResponse = (id) =>
            createJSONRPCErrorResponse(id, 504, "Request timeout.");

        handle_xmpp_error(this.client);
        this.timeout(
            options.timeout | 30000,
            createTimeoutJSONRPCErrorResponse
        );

    }

}





module.exports = { XMPPRPCServer, XMPPRPCClient  };

