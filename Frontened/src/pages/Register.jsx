import {useState} from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from "../services/api";

export default function Register(){
    const[formData, setFormData] = useState({
        name: '',
        email: '',
        password:'',
        phone: '',
    });
    const[error, setError] = useState('');
    const navigate = useNavigate();     
    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try{
             const response = await api.post('/customer/register', formData);
            if(response.data.success){
                const token = response.data.token || response.data.data?.token;
                if (token) {
                    localStorage.setItem('token', token);
                    window.dispatchEvent(new Event('shopkart-auth-change'));
                }
                alert('Registration successful! Please login.');
                navigate('/login');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'An error occurred');
        }   
};

    return(
        <div style={{maxWidth: '400px', margin: '50px auto', fontFamily: 'sans-serif'}}>
            <h2>Create an Account</h2>
            {error && <p style={{color: 'red', fontWeight: 'bold'}}>{error}</p>}
            <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                <div>
                    <label>Name</label><br />
                    <input 
                        type="text" 
                        name="name" 
                        value={formData.name} 
                        onChange={handleChange} 
                        required 
                        style={{ width: '100%', padding: '8px' }}
                    />
                </div>
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

                <div>
                    <label>Phone</label><br />
                    <input 
                        type="tel" 
                        name="phone" 
                        value={formData.phone} 
                        onChange={handleChange} 
                        required 
                        style={{ width: '100%', padding: '8px' }}
                    />
                </div>
                <button type="submit" style={{ padding: '10px', backgroundColor: '#28a745', color: 'white', border: 'none', cursor: 'pointer' }}>
                    Register
                </button>
            </form>
            <p style={{ marginTop: '15px' }}>
                Already have an account? <Link to="/login">Login here</Link>
            </p>
        </div>
    );
}   
        