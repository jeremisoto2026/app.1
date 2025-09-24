// Encriptación básica para las API Keys
export const encrypt = (text) => {
  return btoa(text); // Encriptación Base64 simple
};

export const decrypt = (encryptedText) => {
  return atob(encryptedText); // Desencriptación Base64
};