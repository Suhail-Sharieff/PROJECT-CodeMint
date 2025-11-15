import { useState } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  InputAdornment,
  IconButton,
  Alert,
  CircularProgress,
  Container,
  CssBaseline,
  Grid
} from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { Visibility, VisibilityOff, Code, Person, Email, Phone, Lock } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { getErrorMessage } from "../services/errorHandler";

// Shared CodeMint Theme
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#34D399', // Mint Green
      contrastText: '#0D1117',
    },
    background: {
      default: '#0D1117',
      paper: '#161B22',
    },
    text: {
      primary: '#F0F6FC',
      secondary: '#8B949E',
    },
  },
  components: {
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '& fieldset': { borderColor: '#30363D' },
            '&:hover fieldset': { borderColor: '#8B949E' },
            '&.Mui-focused fieldset': { borderColor: '#34D399' },
          },
        },
      },
    },
  },
});

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: ""
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await api.post("/auth/register", form);
      
      if (res.data && res.data.success) {
        navigate("/login");
      } else {
        setError(res.data?.message || "Registration failed");
      }
    } catch (err) {
      setError(getErrorMessage(err, "Registration failed."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundImage: "radial-gradient(circle at 50% -20%, #1f2937 0%, #0D1117 50%)",
          p: 2,
        }}
      >
        <Container maxWidth="xs">
          <Paper
            elevation={0}
            sx={{
              p: 4,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              borderRadius: 3,
              border: "1px solid #30363D",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            }}
          >
            {/* Logo Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <Box sx={{ bgcolor: 'primary.main', p: 0.5, borderRadius: 1, display: 'flex' }}>
                <Code sx={{ color: '#0D1117', fontSize: 28 }} />
              </Box>
              <Typography variant="h5" fontWeight="800" color="white" letterSpacing={-0.5}>
                CodeMint
              </Typography>
            </Box>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Join the community of developers
            </Typography>

            {error && (
              <Alert 
                severity="error" 
                variant="outlined" 
                sx={{ width: "100%", mb: 3, borderColor: '#ef4444', color: '#fca5a5' }}
              >
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleRegister} sx={{ width: "100%" }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Full Name"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                    InputProps={{ 
                      sx: { borderRadius: 2 },
                      startAdornment: <InputAdornment position="start"><Person sx={{ color: 'text.secondary', fontSize: 20 }} /></InputAdornment>
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Email Address"
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    InputProps={{ 
                      sx: { borderRadius: 2 },
                      startAdornment: <InputAdornment position="start"><Email sx={{ color: 'text.secondary', fontSize: 20 }} /></InputAdornment>
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Phone Number"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    required
                    InputProps={{ 
                      sx: { borderRadius: 2 },
                      startAdornment: <InputAdornment position="start"><Phone sx={{ color: 'text.secondary', fontSize: 20 }} /></InputAdornment>
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    required
                    InputProps={{
                      sx: { borderRadius: 2 },
                      startAdornment: <InputAdornment position="start"><Lock sx={{ color: 'text.secondary', fontSize: 20 }} /></InputAdornment>,
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                          >
                            {showPassword ? <VisibilityOff sx={{ fontSize: 20 }} /> : <Visibility sx={{ fontSize: 20 }} />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
              </Grid>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading}
                sx={{
                  mt: 3,
                  mb: 2,
                  py: 1.5,
                  borderRadius: 2,
                  fontWeight: "bold",
                  fontSize: "0.95rem",
                  textTransform: "none",
                  boxShadow: "0 0 15px rgba(52, 211, 153, 0.3)",
                  '&:hover': {
                    boxShadow: "0 0 25px rgba(52, 211, 153, 0.5)",
                  }
                }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : "Create account"}
              </Button>

              <Box sx={{ textAlign: 'center', mt: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Already have an account?{' '}
                  <Button 
                    variant="text" 
                    size="small"
                    onClick={() => navigate("/login")}
                    sx={{ 
                      textTransform: 'none', 
                      color: 'primary.main', 
                      fontWeight: 600,
                      p: 0,
                      minWidth: 0,
                      ml: 0.5 
                    }}
                  >
                    Log in
                  </Button>
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Container>
      </Box>
    </ThemeProvider>
  );
}