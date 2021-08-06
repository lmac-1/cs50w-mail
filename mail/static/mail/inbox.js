document.addEventListener('DOMContentLoaded', function() {

  // Use buttons to toggle between views
  document.querySelector('#inbox').addEventListener('click', () => load_mailbox('inbox'));
  document.querySelector('#sent').addEventListener('click', () => load_mailbox('sent'));
  document.querySelector('#archived').addEventListener('click', () => load_mailbox('archive'));
  document.querySelector('#compose').addEventListener('click', () => compose_email('new'));

  // By default, load the inbox
  load_mailbox('inbox');
});

function compose_email(type, email) {

  // Show compose view and hide other views
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#email-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'block';

  // Recipients field read only when replying to emails
  document.querySelector('#compose-recipients').readOnly = (type === 'new') ? false : true;

  // Initially set email variables
  var title, recipients, subject, body;
  recipients = ''; 
  subject = '';
  body = '';
  title = (type === 'reply') ? "Reply to email" : "New Email";

  // Saving elements on the page to use later
  const submitButton = document.querySelector('#compose-submit');
  const recipientsList = document.querySelector('#compose-recipients');

  // Prepopulating fields when in "reply" mode and setting recipients field to readonly
  if (type === 'reply') {
    recipients = email.sender;
    subject = (email.subject.slice(0,3) === 'Re:') ? email.subject : `Re: ${email.subject}`;
    body = `\n\n>> On ${email.timestamp} ${email.sender} wrote: \n${email.body}`;
  } 

  // Set HTML elements for new email
  document.querySelector('#compose-title').innerHTML = title;
  document.querySelector('#compose-recipients').value = recipients;
  document.querySelector('#compose-subject').value = subject;
  document.querySelector('#compose-body').value = body;

  // Remove any validation messages
  document.querySelector('#compose-result').innerHTML = '';
  document.querySelector('#compose-result').style.display = 'none';

  // Make sure submit button is blocked in correct circumstances
  blockButtonForField(submitButton, recipientsList)

  // Listen for submission of form
  document.querySelector('#compose-form').onsubmit = () => {
    
    // Saves email content in form into an object to pass into sendEmail function
    const emailObject = {
      recipients: recipientsList.value,
      subject: document.querySelector('#compose-subject').value,
      body: document.querySelector('#compose-body').value
    };

    sendEmail(emailObject)

    // Prevents form automatically submitting
    return false;
  };
  
}

function sendEmail(emailObject) {
  // Makes POST request to send email using form fields
  fetch('/emails', {
    method: 'POST',
    body: JSON.stringify({
      recipients: emailObject.recipients,
      subject: emailObject.subject,
      body: emailObject.body
    })
  })
  .then(response => response.json())
  .then(result => {
    // If successful, load user's sent inbox
    if (!result.error) {
      load_mailbox('sent')
    } 
    else {
      document.querySelector('#compose-result').innerHTML = result.error;
      document.querySelector('#compose-result').style.display = 'block';
      scroll(0,0);
    }
  })
  .catch(error => {
    console.error(error);
  })

}

function load_mailbox(mailbox) {

  // Show the mailbox and hide other views
  document.querySelector('#emails-view').style.display = 'block';
  document.querySelector('#email-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'none';

  // Show the mailbox name
  document.querySelector('#emails-view').innerHTML = `<h3>${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>`;

  // Get emails
  getEmailsHTML(mailbox);

}

// Updates webpage HTML to include all emails for given mailbox
async function getEmailsHTML(mailbox) {
  
  // Waits for the email JSON data
  const emails = await getAllEmails(mailbox);

  // If no emails, update HTML
  if (emails.length === 0) {
    const noResults = document.createElement('div');
    noResults.innerHTML = "You have 0 messages.";
    document.getElementById("emails-view").appendChild(noResults);
  }

  // Creates HTML for each individual email in mailbox table
  emails.forEach((email, index) => {
    
    // Adds new div with HTML and styling to show email information
    const emailDiv = document.createElement('div');
    
    // Sets first column according to mailbox
    let firstColumn = (mailbox != "sent") ? `From: ${email.sender}` : `<strong>To: ${email.recipients}</strong>`;
    
    emailDiv.innerHTML = `
      <div class="col-6 col-sm-7 col-md-4 p-2 text-truncate">${firstColumn}</div>
      <div class="col-6 col-sm-5 col-md-3 p-2 order-md-2 small text-right text-muted font-italic font-weight-lighter align-self-center">${email.timestamp}</div>
      <div class="col px-2 pb-2 pt-md-2 order-md-1 text-truncate">${email.subject}</div>
    `;
    emailDiv.className = 'row justify-content-between border border-left-0 border-right-0 border-bottom-0 pointer-link p-2';

    // Adds grey background for read emails in Inbox
    if (mailbox === "inbox" && email.read == true) {
      emailDiv.style.backgroundColor = '#f1f2f3';
    } 
    // Makes unread emails bold
    if (mailbox === "inbox" && email.read == false) {
      emailDiv.classList.add('font-weight-bold');
    }

    // Adds event listener for each email to call openEmail function when clicked
    emailDiv.addEventListener('click', function () {
      openEmail(email, mailbox);
    },)

    // Fixes borders (the last child has borders on all edges, all others don't have a border on the bottom)
    if (index == emails.length - 1) {
      emailDiv.classList.remove('border-bottom-0');
    }

    // Adds email HTML to the mailbox webpage
    document.getElementById("emails-view").appendChild(emailDiv);

  });
}

// Fetches email JSON data for given mailbox
async function getAllEmails(mailbox) {
  const response = await fetch(`/emails/${mailbox}`);
  const jsonEmailData = await response.json();
  return jsonEmailData;
}

function openEmail(email, mailbox) {
  // Mark as read if unread
  if (!email.read) {
    readEmail(email)
  }
  // Gets email HTML
  getEmail(email, mailbox)
}

// Marks email as read
function readEmail(email) {
  fetch(`/emails/${email.id}`, {
    method: 'PUT',
    body: JSON.stringify({
      read: true
    })
  });
}

function getEmail(email, mailbox) {
  
  // Show the mailbox and hide other views
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'none';
  document.querySelector('#email-view').style.display = 'block';
  
  document.querySelector('#email-view').innerHTML = `
  <div class="d-flex justify-content-between flex-nowrap-sm flex-wrap">
    <h5 class="text-wrap">${email.subject}</h5>
    <small class="mr-lg-4 ml-0 ml-sm-2 font-weight-lighter align-self-center text-muted text-right"><em>${email.timestamp}</em></small>
  </div>

  <div class="d-flex justify-content-between py-3 pt-md-2 border-bottom flex-wrap">
    <div>
      <strong>From:</strong> ${email.sender}<br>
      <strong>To:</strong> ${email.recipients}<br>
    </div>
    <div class="text-nowrap mr-lg-4 ml-0 ml-sm-2" id="buttons">
    </div>
  </div>

  <div class="pt-1" style="white-space: pre-line">
    ${email.body}
  </div>
  `
  // Adds Archive/Unarchive and Reply button for "Inbox" and "Archive"
  let buttonsDiv = document.getElementById('buttons');
  if (mailbox != 'sent') {
    
    // Add "Reply" Button HTML
    const replyButton = document.createElement('button');
    replyButton.type = 'button';
    replyButton.innerHTML = '<i class="fas fa-reply"></i>';
    replyButton.className = 'btn btn-outline-dark btn-sm mr-1';

    // Add buttons to DOM
    buttonsDiv.appendChild(replyButton);

    // Clicking reply takes the user to the compose email form (for mode 'reply')
    replyButton.onclick = () => {
      compose_email('reply', email)
    }
    
    // Add "Archive" Button HTML
    const archiveButton = document.createElement('button');
    var buttonText = (email.archived == false) ? "Archive" : "Unarchive";
    archiveButton.type = 'button';
    archiveButton.innerHTML = buttonText;
    archiveButton.className = 'btn btn-outline-dark btn-sm'

    // Add button to DOM
    buttonsDiv.appendChild(archiveButton);
    
    // Clicking 'archive' button will call archive or unarchive the email
    archiveButton.onclick = () => {
      archiveEmail(email);
    } 
  }
  
}

async function archiveEmail(email) {
  // Waits for status of "archived" of email to be updated
  await fetch(`/emails/${email.id}`, {
    method: 'PUT',
    body: JSON.stringify({
      archived: !email.archived
    })
  })
  // Returns inbox
  return load_mailbox('inbox');
}

// Blocks a button based on a mandatory text field
function blockButtonForField(button, mandatoryField) {

  // Unblocks submit button for prepopulated fields
  if (mandatoryField.value.length == 0) {
    button.disabled = true;
  }

  // Listen for mandatory field to be typed in to unblock button
  mandatoryField.onkeyup = () => {
    if (mandatoryField.value.length > 0) {
      button.disabled = false;
    } else {
      button.disabled = true;
    }
  }
}