var NeBackend = require('./backend/nedb'),
    backend = new NeBackend(),
    store = backend.objectStore();

// store.query().then(function(res) {
//     console.log(res);
// })
    
store.add({id: 1, name: 'ahoj'}).then(function(res) {
    console.log(res);
    store.get(1).then(function(res) {
        console.log(res);
    });

    store.query({}).then(function(res) {
        console.log(res);
    });
    
});



// store._db.insert({name: 'cau'}, function(err, res) {
//     console.log(res);
//     store._db.find({_id: res._id}, function() {
//         console.log(arguments);
//     });
//     
//     
// });



// setTimeout(function() {
//     console.log('exit');
// }, 10000);