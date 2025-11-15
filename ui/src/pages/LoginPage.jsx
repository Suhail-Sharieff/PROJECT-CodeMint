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
} from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { Visibility, VisibilityOff, Code } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { getErrorMessage } from "../services/errorHandler";
import { useAuth } from "../context/AuthContext";

// 1. Define a custom Dark/Mint theme for CodeMint
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#34D399', // Mint Green
      contrastText: '#0D1117', // Dark background color for text on buttons
    },
    background: {
      default: '#0D1117', // GitHub-style dark background
      paper: '#161B22',   // Slightly lighter card background
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

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await api.post("/auth/login", form);

      if (res.data && res.data.data && res.data.data.user) {
        login({
          user: res.data.data.user,
          accessToken: res.data.data.accessToken,
          refreshToken: res.data.data.refreshToken
        });
        navigate("/"); 
      } else {
        setError("Invalid response from server");
      }
    } catch (err) {
      setError(getErrorMessage(err, "Login failed."));
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
          backgroundImage: "radial-gradient(circle at 50% -20%, #1f2937 0%, #0D1117 50%)", // Subtle glow at top
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
            {/* Logo / Branding */}
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1.5, 
                mb: 1 
              }}
            >
              <Box 
                sx={{ 
                  bgcolor: 'primary.main', 
                  p: 0.5, 
                  borderRadius: 1, 
                  display: 'flex' 
                }}
              >
                <Code sx={{ color: '#0D1117', fontSize: 28 }} />
              </Box>
              <Typography variant="h5" fontWeight="800" color="white" letterSpacing={-0.5}>
                CodeMint
              </Typography>
            </Box>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
              Sign in to continue coding
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

            <Box component="form" onSubmit={handleLogin} sx={{ width: "100%" }}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Email Address"
                name="email"
                autoComplete="email"
                autoFocus
                value={form.email}
                onChange={handleChange}
                InputProps={{ sx: { borderRadius: 2 } }}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type={showPassword ? "text" : "password"}
                id="password"
                autoComplete="current-password"
                value={form.password}
                onChange={handleChange}
                InputProps={{
                  sx: { borderRadius: 2 },
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

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
                  boxShadow: "0 0 15px rgba(52, 211, 153, 0.3)", // Mint glow
                  '&:hover': {
                    boxShadow: "0 0 25px rgba(52, 211, 153, 0.5)",
                  }
                }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : "Sign in"}
              </Button>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                <Button 
                    size="small" 
                    onClick={() => navigate("/register")}
                    sx={{ textTransform: 'none', color: 'primary.main' }}
                >
                    Create account
                </Button>
                <Button 
                    size="small" 
                    sx={{ textTransform: 'none', color: 'text.secondary' }}
                >
                    Forgot password?
                </Button>
              </Box>
            </Box>
          </Paper>
        </Container>
      </Box>
    </ThemeProvider>
  );
}