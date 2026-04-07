// Get user's network information
export const getNetworkInfo = async () => {
  try {
    // Method 1: Get IP address from external API
    const ipResponse = await fetch('https://api.ipify.org?format=json');
    const ipData = await ipResponse.json();
    
    // Method 2: Try to get local network info
    const localIP = await getLocalIP();
    
    return {
      publicIP: ipData.ip,
      localIP: localIP,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error getting network info:', error);
    return null;
  }
};

// Get local IP using WebRTC (works in browser)
const getLocalIP = () => {
  return new Promise((resolve, reject) => {
    // Create a bogus data channel
    const pc = new RTCPeerConnection({
      iceServers: []
    });
    
    pc.createDataChannel('');
    
    pc.createOffer()
      .then(offer => pc.setLocalDescription(offer))
      .catch(reject);
    
    pc.onicecandidate = (ice) => {
      if (!ice || !ice.candidate || !ice.candidate.candidate) {
        resolve(null);
        return;
      }
      
      const ipMatch = /([0-9]{1,3}(\.[0-9]{1,3}){3})/.exec(ice.candidate.candidate);
      
      if (ipMatch) {
        const localIP = ipMatch[1];
        pc.close();
        resolve(localIP);
      }
    };
    
    // Timeout after 2 seconds
    setTimeout(() => {
      pc.close();
      resolve(null);
    }, 2000);
  });
};

// Check if user is on the same subnet
export const isSameSubnet = (userIP, classroomSubnet) => {
  if (!userIP || !classroomSubnet) return false;
  
  // Extract subnet (first 3 octets)
  const userSubnet = userIP.split('.').slice(0, 3).join('.');
  
  return userSubnet === classroomSubnet;
};

// Check if WiFi SSID matches (requires user to manually enter)
export const verifyWiFiSSID = (userSSID, classroomSSID) => {
  if (!userSSID || !classroomSSID) return false;
  
  // Case-insensitive comparison
  return userSSID.trim().toLowerCase() === classroomSSID.trim().toLowerCase();
};