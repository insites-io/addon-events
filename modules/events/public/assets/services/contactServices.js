var contactServices = (function () {
    return {
        validateEmail: function (email) {
            return httpClient.processRequest('get', '/validate-email.json?email=' + email);
        },
        addContact: function (payload) {
            return httpClient.processRequest('post', '/create-contact-company', payload);
        },
        updateContact: function (payload) {
            return httpClient.processRequest('put', '/update-contact', payload);
        },
        addPassword: function (payload) {
            return httpClient.processRequest('put', '/add-password', payload);
        }
    };
})();
