const API_KEY = "AIzaSyCLdb3NDD1sCtPzkkk0jODUePMePO4Z56g";
const DISCOVERY_DOC =
  "https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest";
function onGAPILoad() {
  gapi.client
    .init({
      // Don't pass client nor scope as these will init auth2, which we don't want
      apiKey: API_KEY,
      discoveryDocs: [DISCOVERY_DOC],
    })
    .then(
      function () {
        console.log("gapi initialized");
      },
      function (error) {
        console.log("error", error);
      }
    );
}

function sendMail(receiver, topic) {
  if (!receiver || !topic) {
    alert("please fill all fields");
    return;
  }
  
  chrome.identity.getAuthToken({ interactive: true }, async function (token) {
    gapi.auth.setToken({
      access_token: token,
    });
    let response = await fetch("http://104.248.12.97:3000?prompt=" + topic);
    let text = await response.text();
    chrome.identity.getProfileUserInfo(function (userInfo) {
      const message =
        "From: ChatGPT bot" +
        "\r\n" +
        "To: " +
        receiver +
        "\r\n" +
        "Subject: "+ topic+"\r\n\r\n" +
        text;

      // The body needs to be base64url encoded.
      const encodedMessage = btoa(message);

      const reallyEncodedMessage = encodedMessage
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      gapi.client.gmail.users.messages
        .send({
          userId: "me",
          resource: {
            // same response with any of these
            raw: reallyEncodedMessage,
            // raw: encodedMessage
            // raw: message
          },
        })
        .then(function () {
          alert('mail successfully sent!')
        });

    });
  });
}
/* function which creates the meeting*/
function createMeeting(chatContent,type) {
  console.log('event type:'+ type);
  chrome.identity.getAuthToken({ interactive: true }, function (token) {

    chrome.identity.getProfileUserInfo( async function (userInfo) {
      let organizer = userInfo.email;
       //parse essential data from chat content.
      //making plain text to query with openai
      if(type === 'schedule') {
        let question = `get event_name,email,action,duration in miliseconds,date_time as json format with curly braces in this sentense "${chatContent}"`;
        let response = await fetch("http://104.248.12.97:3000?prompt=" + question);
        let text = await response.text();
        let parsedJson = JSON.parse(text);
        let customer = parsedJson.email;
  
        let startDate = new Date(parsedJson.date_time);
        let endDate = new Date(startDate.getTime() + parsedJson.duration);
        let isoStartDate = new Date(startDate.getTime()).toISOString().split(".")[0];
        let isoEndDate = new Date(endDate.getTime()).toISOString().split(".")[0];
        //details about the event
        let event = {
          summary: parsedJson.event_name,
          description: "Google Meeting created using a chrome extension OpenAI",
          start: {
            dateTime: `${isoStartDate}`,
            timeZone: 'Europe/London',
          },
          end: {
            dateTime: `${isoEndDate}`,
            timeZone: 'Europe/London',
          },
          conferenceData: {
            createRequest: { requestId: "7qxalsvy0e" },
          },
          attendees: [
            {'email': organizer},
            {'email': customer},
          ],
          reminders: {
            'useDefault': false,
            'overrides': [
              {'method': 'email', 'minutes': 24 * 60},
              {'method': 'popup', 'minutes': 10},
            ],
          },
        };
  
        let fetch_options = {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(event),
        };
  
        fetch(
          "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1",
          fetch_options
        )
          .then((response) => response.json()) // Transform the data into json
          .then(function (data) {
            console.log(data);
            // document.getElementById('chat_viewer').insertAdjacentHTML(
            //   'BeforeEnd', 
            //   `<div style="text-align:left;margin-bottom:10px">
            //       Invitation mail sent to ${customer}.<br/> Meeting start time : ${startDate} <br/> Event Name : ${parsedJson.event_name}
            //   </div>`
            // );
          });
      
      }
      else if((type === 'reschedule') || (type === 'decline')){
        let question;
        if(type === 'reschedule'){
          question = `get event_name,email,duration in miliseconds,date_time as json format with curly braces in this sentense "${chatContent}"`;
        }
        else {
          question = `get email,date_time as json format with curly braces in this sentense "${chatContent}"`;
        }
        let response = await fetch("http://104.248.12.97:3000?prompt=" + question);
        let text = await response.text();
        let parsedJson = JSON.parse(text);
        let customer = parsedJson.email;
        console.log(parsedJson)
        let fetch_option = {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        };
  
        fetch(
          "https://www.googleapis.com/calendar/v3/calendars/primary/events",
          fetch_option
        )
          .then((response) => response.json()) // Transform the data into json
          .then(function (data) {
            let calendarList = data;
            console.log(calendarList)
            if(calendarList.items){
              console.log(calendarList.items)
              calendarList.items.map((item) => {
                let canUpdate = false;
                if(!item.attendees){
                  return;
                }
                
                  item.attendees.map(attendee => {
                    //find customer's email address in attendees list
                    if(attendee.email === customer ){
                      canUpdate = true;
                    }
                  })
                
                if(item.attendees && canUpdate){
                  let startDate = new Date(parsedJson.date_time);
                  let endDate = new Date(startDate.getTime() + parsedJson.duration);
                  let attendees = item.attendees;
                  if(type === 'decline'){
                    attendees.map(attendee => {
                      if(attendee.email === organizer){
                        attendee.responseStatus = 'declined'
                      }
                    })
                  }
                  let meetingStart,meetingEnd;
                  if(type === 'reschedule'){
                    let isoStartDate = new Date(startDate.getTime()).toISOString().split(".")[0];
                    let isoEndDate = new Date(endDate.getTime()).toISOString().split(".")[0];
                    meetingStart = {
                      dateTime: `${isoStartDate}`,
                      timeZone: 'Europe/London',
                    };
                    meetingEnd = {
                      dateTime: `${isoEndDate}`,
                      timeZone: 'Europe/London',
                    }
                  }else {
                    meetingStart = item.start;
                    meetingEnd = item.end;
                  }
                  //details about the event
                  
                
                  let event = {
                    summary: item.summary,
                    description: item.description,
                    start: meetingStart,
                    end: meetingEnd,
                    attendees,
                    reminders: {
                      'useDefault': false,
                      'overrides': [
                        {'method': 'email', 'minutes': 24 * 60},
                        {'method': 'popup', 'minutes': 10},
                      ],
                    },
                  };
                  let fetch_options = {
                    method: "PUT",
                    headers: {
                      Authorization: `Bearer ${token}`,
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify(event),
                  };
            
                  fetch(
                    "https://www.googleapis.com/calendar/v3/calendars/primary/events/"+item.id,
                    fetch_options
                  )
                    .then((response) => response.json()) // Transform the data into json
                    .then(function (data) {
                      console.log(data);
                      if(type === 'reschedule'){
                        // return `Meeting has rescheduled successfully. \n Meeting start time : ${startDate} \n Event Name : ${parsedJson.event_name}`;
                      }else {
                        // return `Meeting has declined successfully.`;
                      }
                    });
                }
              })
            }
          });
            
      }
    });
  });
}
 
  //Listening to event triggers from the frontend
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log(request);
    if (request.msg === "send_mail") {
      console.log("send_mail event triggered");
      sendMail(request.receiver, request.topic);
    } else if (request.msg === "create_meeting") {
      console.log(request.chatContent);
      createMeeting(request.chatContent,request.type);
      return sendResponse({result:'success'});
    }
  });