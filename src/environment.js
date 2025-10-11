const dev = "https://usstaging.ivisecurity.com";
const event = "https://stagingmq.ivisecurity.com";
const local = "http://192.168.0.126:3009"


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
    alert_categories_url: `${local}`
};
