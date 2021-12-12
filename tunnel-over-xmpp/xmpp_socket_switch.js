const JobQueue = require("./jobqueue");

const sockets = {};

async function destroy_connection(app, socket, forced){
    if(!socket) return;
    socket.send_queue.destroy();
    socket.recv_queue.destroy();

    var connection_id = socket && socket.id ? socket.id : undefined;
    try{
        if(forced){
            socket.destroy();
        } else {
            socket.end();
        }
    } catch(e){
    } finally {
        if(connection_id && sockets[connection_id]){
            delete sockets[connection_id];
        }
    }

    try{
        if(connection_id){
            await app.xmpprpc_client.request("close", { id: connection_id });
        }
    } catch(e){
        console.error(e);
    }
}







async function setup_socket(app, socket, initfunc){

    socket.send_queue = new JobQueue(async function(data){
        if(!socket.id) return false;

        //console.log(socket.id, "SEND", data.length, " bytes");

        try{
            await app.xmpprpc_client.request("data", {
                id: socket.id, 
                data: data.toString("base64"),
            });
        } catch(e){
        }
        return true;
    });
    socket.recv_queue = new JobQueue(async function(data){
        //console.log(socket.id, "RECV", data.length, " bytes");
        socket.write(Buffer.from(data, "base64"));
        return true;
    });

    socket.on("data", (data)=>socket.send_queue.push(data));

    try{
        await initfunc();
        if(socket.id == undefined) throw Error();
    } catch(e){
        // destroy socket
        destroy_connection(app, socket);
        return;
    }

    socket.on("end", ()=>destroy_connection(app, socket));
    socket.on("error", (e)=>{
        console.error(e);
        destroy_connection(app, socket, true);
    });

    sockets[socket.id] = socket;

    return socket.id;
}


async function write_to_socket(app, socket_id, data){
    if(sockets[socket_id] === undefined){
        console.error("Failed writting to ", socket_id, " -- not found.");
        return; // TODO close xmpp socket_id
    }
    sockets[socket_id].recv_queue.push(data);
}


async function close_socket(app, socket_id){
    destroy_connection(app, sockets[socket_id]);
}

module.exports = {
    setup_socket, write_to_socket, close_socket
}
