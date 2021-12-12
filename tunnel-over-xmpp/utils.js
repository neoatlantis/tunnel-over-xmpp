const { v4: uuidv4 } = require('uuid');


module.exports = {

    uuid: function(){
        return uuidv4();
    }

}
