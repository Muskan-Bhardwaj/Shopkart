import { useState } from "react";
import { useNavigate, Link } from 'react-router-dom';
import api from "../services/api";

export default function Login() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

 const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const response = await api.post("/customer/login", formData);
      console.log("Login Response Data:", response.data); // Debug check

      // Support response with or without response.data.success flag
      const token = response.data.token || response.data.data?.token;

      if (token) {
        // Save valid token to localStorage
        localStorage.setItem('token', token);
        window.dispatchEvent(new Event('shopkart-auth-change'));
        
        // Redirect to /home
        navigate("/home");
      } else {
        setError("Token missing from server response");
      }
    } catch (err) {
      setError(err.response?.data?.message || "An error occurred during login");
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', fontFamily: 'sans-serif' }}>
      <h2>Login to ShopKart</h2>
      
      {error && <p style={{ color: 'red', fontWeight: 'bold' }}>{error}</p>}
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div>
          <label>Email</label><br />
          <input 
            type="email" 
            name="email" 
            value={formData.email} 
            onChange={handleChange} 
            required 
            style={{ width: '100%', padding: '8px' }}
          />
        </div>

        <div>
          <label>Password</label><br />
          <input 
            type="password" 
            name="password" 
            value={formData.password} 
            onChange={handleChange} 
            required 
            style={{ width: '100%', padding: '8px' }}
          />
        </div>

        <button type="submit" style={{ padding: '10px', backgroundColor: '#28a745', color: 'white', border: 'none', cursor: 'pointer' }}>
          Login
        </button>
      </form>
      
      <p style={{ marginTop: '15px' }}>
        Don't have an account? <Link to="/register">Register here</Link>
      </p>
    </div>
  );
}