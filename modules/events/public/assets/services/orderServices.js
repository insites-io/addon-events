var orderServices = (function () {
    return {
        addOrder: function (payload) {
            return httpClient.processRequest('post', '/create-order', payload);
        },
        updateOrder: function (payload) {
            return httpClient.processRequest('post', '/update-order', payload);
        }
    };
})();
