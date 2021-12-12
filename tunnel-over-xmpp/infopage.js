function htmlgen(html){
    return [
        'HTTP/1.1 200 OK',
        'Connection: close',
        'Content-Type: text/plain',
        'Content-Length: ' + Buffer.byteLength(html),
        '',
        html 
    ].join('\r\n');
}

function htmltemplate(body){ return `
    <html>
        <head>
            <meta charset="utf-8" />
            <title>XMPP Tunnel Proxy</title>
        </head>
        <body>${body}</body>
    </html>
`;}

function errortemplate(message){ return htmltemplate(`
    <h1>Error</h1>
    <hr />
    <div style="color:red">${message}</div>
`);}



module.exports = {

    connection_refused: function(info){
        if(info.dstPort != 80) return;

        return errortemplate(
            "Connection refused by remote gateway server."
        );
        
    }



}
