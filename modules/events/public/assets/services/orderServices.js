var orderServices = (function () {
    return {
        addOrder: function (payload) {
            return httpClient.processRequest('post', '/create-order', payload);
        }
    };
})();
