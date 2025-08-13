import 'dart:developer';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';

import '../../constants/enums.dart';
import '../../widgets/show_toast.dart';

class AuthMethods {
  static final instance = FirebaseAuth.instance;

  static Future<bool> signUp({
    required String email,
    required String password,
    required BuildContext context,
  }) async {
    try {
      if (email.isEmpty || password.isEmpty) {
        showToast(context, 'Enter proper email/password !', ToastType.WARNING);
        return false;
      }
      await instance.createUserWithEmailAndPassword(
        email: email,
        password: password,
      );
      return true;
    } catch (e) {
      showToast(context, e.toString(), ToastType.ERROR);
    }
    return false;
  }

  static Future<SignedUpUserStatus> signIn({
    required String email,
    required String password,
    required BuildContext context,
  }) async {
    try {
      final res = await instance.signInWithEmailAndPassword(
        email: email,
        password: password,
      );
      if (res.user!.emailVerified) {
        return SignedUpUserStatus.IS_EMAIL_VERFIED;
      }
      return SignedUpUserStatus.IS_NOT_EMAIL_VERFIED;
    } on FirebaseAuthException catch (e) {
      showToast(context, e.message.toString(), ToastType.ERROR);
    }
    return SignedUpUserStatus.INVALID;
  }

  static Future<void> sendVerifyLink({
    required BuildContext context,
  }) async {
    try {
      await instance.currentUser?.sendEmailVerification();
    } catch (e) {
      showToast(context, "Some error occurred in sending mail!", ToastType.ERROR);
    }
  }

  static Future<void> logout({
    required BuildContext context,
  }) async {
    try {
      await instance.signOut();
    } catch (e) {
      showToast(context, "Some error occurred in logging out!", ToastType.ERROR);
    }
  }
}
