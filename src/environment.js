const dev = "https://usstaging.ivisecurity.com";
const event= "https://stagingmq.ivisecurity.com";


export const environment = {
    login_url: `${dev}/userDetails`,
    site_url: `${dev}/vipsites`,
    common_url: `${dev}/metadata`,
    download_url: `${dev}/common`,
    guard_monitoring_url: `${dev}/guard_monitoring`,
    escalation_url: `${dev}/monitoring`,
    eventImageUrl: `${dev}/dotimages/`,
    event_process_url: `${dev}/events_data`,
    events_url: `${event}/queueManagement`,
};
