import 'package:code_mint_frontend/pages/create_session_page.dart';
import 'package:code_mint_frontend/pages/forgot_password_page.dart';
import 'package:code_mint_frontend/pages/home_page.dart';
import 'package:code_mint_frontend/pages/landing_page.dart';
import 'package:code_mint_frontend/pages/login_page.dart';
import 'package:code_mint_frontend/pages/signup_page.dart';
import 'package:code_mint_frontend/pages/verify_email_page.dart';
import 'package:flutter/cupertino.dart';

const landing_route='/landing/';
const login_route='/login';
const forgot_password_route='/forgotPassword';
const signup_route='/signup/';
const verify_email_route='/verifyEmail/';
const home_route='/home/';

const create_session_route='/createSession';
const join_session_route='/joinSession';



final Map<String, WidgetBuilder> routes = {
  LandingPage.route_name:(_)=>const LandingPage(),
  HomePage.route_name:(_)=>const HomePage(),
  LoginPage.route_name:(_)=>const LoginPage(),
  ForgotPassWordPage.route_name:(_)=>const ForgotPassWordPage(),
  SignupPage.route_name:(_)=>const SignupPage(),
  VerifyEmailPage.route_name:(_)=>const VerifyEmailPage(),
  CreateSessionPage.route_name:(_)=>const CreateSessionPage(),
};