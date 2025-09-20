import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

const Profile = () => {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        try {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            setProfileData(docSnap.data());
          } else {
            console.log("No se encontraron datos del perfil.");
          }
        } catch (error) {
          console.error("Error al obtener perfil:", error);
        }
      }
      setLoading(false);
    };

    fetchProfile();
  }, [user]);

  if (loading) return <p>Cargando perfil...</p>;
  if (!profileData) return <p>No se encontraron datos del perfil.</p>;

  return (
    <div style={{ padding: "20px", color: "white" }}>
      <h2>Perfil</h2>
      <p><strong>UID:</strong> {profileData.uid}</p>
      <p><strong>Email:</strong> {profileData.email}</p>
      <p><strong>Nombre:</strong> {profileData.nombre}</p>
      <p><strong>Apellido:</strong> {profileData.apellido}</p>
      <p><strong>Plan:</strong> {profileData.plan}</p>
      <p><strong>Creado:</strong> {profileData.createdAt?.toDate().toLocaleString()}</p>

      {profileData.photoURL && (
        <img 
          src={profileData.photoURL} 
          alt="Foto de perfil" 
          style={{ width: "100px", borderRadius: "50%", marginTop: "10px" }}
        />
      )}
    </div>
  );
};

export default Profile;