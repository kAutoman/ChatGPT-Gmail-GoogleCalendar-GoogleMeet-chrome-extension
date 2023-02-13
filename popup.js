// let mail_button = document.getElementById('mail_button');
let meeting_button = document.getElementById('meeting_button');
let chatBox = document.getElementById('chatBox');

chatBox.addEventListener('keyup',function (e) {
    console.log(e);
    e.preventDefault();
    if(e.key === 'Enter'){
        meeting_button.click();
    }
    return;
})
// mail_button.addEventListener('click',function(){
//     console.log('mail send button clicked....')
//     let receiver = document.getElementById('receiver').value;
//     let topic = document.getElementById('topic').value;
//     chrome.runtime.sendMessage({msg: 'send_mail',receiver,topic});
// })




meeting_button.addEventListener('click',async function(){
    let chatContent = document.getElementById('chatBox').value;
    
    if(!chatContent){
        alert('Please input message content!');
        return;
    }
    if(chatContent.match(/schedule|reschedule|decline/g) && (chatContent.match(/schedule|reschedule|decline/g).length > 0)){
        document.getElementById('chat_viewer').insertAdjacentHTML('BeforeEnd', `<div style="text-align:left"><a href="#">Processing your message....</a></div>`);
        document.getElementById('chat_viewer').scrollTop = document.getElementById('chat_viewer').scrollHeight;
        chatBox.value = '';chatBox.value = '';
        let type;
        //in case of meeting create
        if(chatContent.indexOf('reschedule') > -1){
            type = 'reschedule';
        }
        else if(chatContent.indexOf('schedule') > -1){
            type = 'schedule';
        }
        else if(chatContent.indexOf('decline') > -1){
            type = 'decline';
        }
        chrome.extension.sendMessage({msg: "create_meeting",chatContent,type}, function(resp) {
            console.log(resp)
            if(resp.result === 'success'){
                let message = '';
                switch (type) {
                    case 'reschedule':
                        message = 'rescheduled'
                        break;
                    case 'schedule':
                        message = 'scheduled'
                        break;
                    case 'decline':
                        message = 'declined'
                        break;
                }
                document.getElementById('chat_viewer').insertAdjacentHTML('BeforeEnd', `<div style="text-align:left"><a href="#">Meeting ${message} successfully....</a></div>`);
            }
        });
    } else {
        document.getElementById('chat_viewer').insertAdjacentHTML('BeforeEnd', `<div style="text-align:right; margin-right:10px;margin-bottom:10px;"><a href="#">${chatContent}</a></div>`);
        chatBox.value = '';
        let response = await fetch("http://104.248.12.97:3000?prompt=" + chatContent);
        let text = await response.text();
        console.log(text)
        document.getElementById('chat_viewer').insertAdjacentHTML('BeforeEnd', `<div style="text-align:left;margin-bottom:10px"><a href="#">${text}</a></div>`);
        document.getElementById('chat_viewer').scrollTop = document.getElementById('chat_viewer').scrollHeight;
    }
})

  
 
  