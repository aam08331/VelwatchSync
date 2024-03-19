const participants = [
    { name: "Participant 1", lastSyncTime: "10:00 AM" },
    { name: "Participant 2", lastSyncTime: "11:30 AM" },
    { name: "Participant 3", lastSyncTime: "12:45 PM" }
  ];
  
  // Container to hold dynamically generated elements
  const container = document.getElementById("container");
  
  // Iterate through the participants array
  for (let i = 0; i < participants.length; i++) {
    // Create body-box div
    const bodyBox = document.createElement("div");
    bodyBox.classList.add("body-box");
  
    // Create participant paragraph
    const participantPara = document.createElement("p");
    participantPara.innerHTML = `<b>Participant:</b> ${participants[i].name}`;
  
    // Create last sync time paragraph
    const lastSyncTimePara = document.createElement("p");
    lastSyncTimePara.innerHTML = `<b>Last Sync Time:</b> ${participants[i].lastSyncTime}`;
  
    // Create Sync Now button
    const syncNowBtn = document.createElement("button");
    syncNowBtn.classList.add("buttons");
    syncNowBtn.innerHTML = "<b>Sync Now</b>";
  
    // Create Take Survey button
    const takeSurveyBtn = document.createElement("button");
    takeSurveyBtn.classList.add("buttons");
    takeSurveyBtn.innerHTML = "<b>Take Survey</b>";
  
    // Append elements to bodyBox
    bodyBox.appendChild(participantPara);
    bodyBox.appendChild(lastSyncTimePara);
    bodyBox.appendChild(syncNowBtn);
    bodyBox.appendChild(takeSurveyBtn);
  
    // Append bodyBox to container
    container.appendChild(bodyBox);
  }