var apiServices = (function () {
    return {
        validateDiscountCode: function (payload) {
            return httpClient.processRequest('post', '/validate-discount-code.json', payload);
        },
        removeDiscountCode: function (payload) {
            return httpClient.processRequest('post', '/remove-discount-code.json', payload);
        },
        processRequest: httpClient.processRequest
    };
})();
