import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { getUserPreferences } from "../services/database";

const Profile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        if (user?.uid) {
          const data = await getUserPreferences(user.uid);
          setProfile(data);
        }
      } catch (error) {
        console.error("Error loading profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  if (loading) {
    return <p>Cargando perfil...</p>;
  }

  if (!profile) {
    return <p>No se encontraron datos del perfil.</p>;
  }

  return (
    <div style={{ padding: "20px" }}>
      <h2>Perfil</h2>
      <img
        src={profile.photoURL || "https://via.placeholder.com/100"}
        alt="Avatar"
        style={{ borderRadius: "50%", width: "100px" }}
      />
      <p><strong>Nombre:</strong> {profile.nombre || "No definido"}</p>
      <p><strong>Apellido:</strong> {profile.apellido || "No definido"}</p>
      <p><strong>Email:</strong> {user?.email}</p>
      <p><strong>Plan:</strong> {profile.plan || "free"}</p>
    </div>
  );
};

export default Profile;