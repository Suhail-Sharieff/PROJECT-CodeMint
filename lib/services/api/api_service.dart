import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiService {
  /// Change this if you're running Android emulator:
  /// Android emulator -> 'http://10.0.2.2:3001'
  /// iOS simulator -> 'http://localhost:3001'
  /// Web/Desktop -> 'http://localhost:3001'
  static String baseOrigin = 'http://localhost:3001';
  static String get baseUrl => "$baseOrigin/api";

  static Future<Map<String, dynamic>> createSession(String teacherName) async {
    print(baseUrl);
    final res = await http.post(
      Uri.parse('$baseUrl/create-session'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'teacherName': teacherName}),
    );
    print("Res="+res.body.toString());
    if (res.statusCode != 200) {
      throw Exception('Failed to create session: ${res.body}');
    }
    return jsonDecode(res.body);
  }

  static Future<Map<String, dynamic>?> getSession(String sessionId) async {
    final res = await http.get(Uri.parse('$baseUrl/session/$sessionId'));
    if (res.statusCode == 200) {
      return jsonDecode(res.body) as Map<String, dynamic>;
    }
    return null;
  }
}