var ticketServices = (function () {
    return {
        checkTicketAvailability: function (uuid, payload) {
            return httpClient.processRequest('get', '/check-ticket-availability?eventuuid=' + uuid + '&ticketData=' + payload);
        },
        createTickets: function (uuid, payload) {
            return httpClient.processRequest('post', '/create-tickets?eventuuid=' + uuid + '&ticketData=' + payload);
        },
        allocateTicket: function (eventUuid, ticketUuid, payload) {
            return httpClient.processRequest('put', '/allocate-ticket?eventUUID=' + eventUuid + '&ticketUUID=' + ticketUuid + '&ticketData=' + payload);
        }
    };
})();
