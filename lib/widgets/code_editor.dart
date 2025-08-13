import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_code_editor/flutter_code_editor.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:highlight/languages/java.dart';

// Import the languages you need
import 'package:highlight/languages/javascript.dart';
import 'package:highlight/languages/python.dart';
import 'package:highlight/languages/cpp.dart';

// Import a dark theme for the editor
import 'package:flutter_highlight/themes/monokai-sublime.dart';

// --- (You can move these to a central constants file) ---
const kBackgroundColor = Color(0xFF0D1117);
const kCardColor = Color(0xFF161B22);
const kPrimaryColor = Color(0xFF23D997);
const kSecondaryTextColor = Color(0xFF8B949E);
const kInputBorderColor = Color(0xFF30363D);

class CodeEditor extends StatefulWidget {
  final String initialCode;
  final String language;
  final bool readOnly;
  final void Function(String code, String language)? onChanged;

  const CodeEditor({
    super.key,
    required this.initialCode,
    required this.language,
    this.readOnly = false,
    this.onChanged,
  });

  @override
  State<CodeEditor> createState() => _CodeEditorState();
}

class _CodeEditorState extends State<CodeEditor> {
  late CodeController _controller;
  late String _currentLanguage;

  // Use a proper dark theme for the code editor
  final Map<String, TextStyle> _codeTheme = monokaiSublimeTheme;

  @override
  void initState() {
    super.initState();
    _currentLanguage = widget.language;
    _controller = CodeController(
      text: widget.initialCode,
      language: _getHighlightLanguage(_currentLanguage),
    );
    _controller.addListener(() {
      widget.onChanged?.call(_controller.text, _currentLanguage);
    });
  }

  @override
  void didUpdateWidget(covariant CodeEditor oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Update code only if it's different from the controller's current text
    if (widget.initialCode != oldWidget.initialCode && widget.initialCode != _controller.text) {
      _controller.text = widget.initialCode;
    }
    // Update language if it changes
    if (widget.language != oldWidget.language) {
      setState(() {
        _currentLanguage = widget.language;
        _controller.language = _getHighlightLanguage(_currentLanguage);
      });
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        _buildHeaderBar(),
        const SizedBox(height: 8),
        Expanded(
          child: CodeTheme(
            data: CodeThemeData(styles: _codeTheme),
            child: CodeField(
              controller: _controller,
              readOnly: widget.readOnly,
              textStyle: GoogleFonts.firaCode(fontSize: 14), // Use a popular coding font
              background: kCardColor, // Set a matching background color
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildHeaderBar() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: kBackgroundColor,
        border: Border(bottom: BorderSide(color: kInputBorderColor)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          _buildLanguageSelector(),
          IconButton(
            icon: const Icon(Icons.copy_all_rounded, color: kSecondaryTextColor, size: 20),
            tooltip: 'Copy Code',
            onPressed: () {
              Clipboard.setData(ClipboardData(text: _controller.text));
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Code copied to clipboard!')),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildLanguageSelector() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: kCardColor,
        borderRadius: BorderRadius.circular(8),
      ),
      child: DropdownButton<String>(
        value: _currentLanguage,
        isDense: true,
        dropdownColor: kCardColor,
        style: GoogleFonts.poppins(color: Colors.white, fontSize: 14),
        underline: const SizedBox.shrink(), // Remove the default underline
        icon: const Icon(Icons.keyboard_arrow_down_rounded, color: kSecondaryTextColor, size: 20),
        items: const [
          DropdownMenuItem(value: 'javascript', child: Text('JavaScript')),
          DropdownMenuItem(value: 'python', child: Text('Python')),
          DropdownMenuItem(value: 'cpp', child: Text('C++')),
          DropdownMenuItem(value: 'java', child: Text('Java')),
        ],
        onChanged: widget.readOnly
            ? null
            : (value) {
          if (value == null) return;
          setState(() {
            _currentLanguage = value;
            _controller.language = _getHighlightLanguage(_currentLanguage);
          });
          widget.onChanged?.call(_controller.text, _currentLanguage);
        },
      ),
    );
  }

  // Helper map for languages
  static final _languages = {
    'javascript': javascript,
    'python': python,
    'cpp': cpp,
    'java': java,
  };

  // Helper function to get the language syntax highlighter
  static dynamic _getHighlightLanguage(String lang) => _languages[lang] ?? javascript;
}