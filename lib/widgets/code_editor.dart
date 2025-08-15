import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_code_editor/flutter_code_editor.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:highlight/languages/java.dart';
import 'package:highlight/languages/javascript.dart';
import 'package:highlight/languages/python.dart';
import 'package:highlight/languages/cpp.dart';
import 'package:flutter_highlight/themes/monokai-sublime.dart';

import '../services/api/socket_service.dart';



const kBackgroundColor = Color(0xFF0D1117);
const kCardColor = Color(0xFF161B22);
const kPrimaryColor = Color(0xFF23D997);
const kSecondaryTextColor = Color(0xFF8B949E);
const kInputBorderColor = Color(0xFF30363D);

class CodeEditor extends StatefulWidget {
  final String initialCode;
  final String language;
  final bool readOnly;
  final SocketService socketService;
  final void Function(String code, String language)? onChanged;

  const CodeEditor({
    super.key,
    required this.initialCode,
    required this.language,
    required this.socketService,
    this.readOnly = false,
    this.onChanged,
  });

  @override
  State<CodeEditor> createState() => _CodeEditorState();
}

class _CodeEditorState extends State<CodeEditor> {
  late CodeController _controller;
  late String _currentLanguage;
  final Map<String, TextStyle> _codeTheme = monokaiSublimeTheme;

  StreamSubscription<Map<String, dynamic>>? _codeUpdateSub;

  Timer? _debounce;
  bool _suppressLocalEmit = false;

  @override
  void initState() {
    super.initState();
    _currentLanguage = widget.language;
    _controller = CodeController(
      text: widget.initialCode,
      language: _getHighlightLanguage(_currentLanguage),
    );

    _controller.addListener(_onLocalChange);

    // listen to socket updates
    _codeUpdateSub = widget.socketService.codeUpdate$.listen((data) {
      final remoteCode = (data['code'] as String?) ?? '';
      final remoteLang = (data['language'] as String?) ?? _currentLanguage;

      if (remoteLang != _currentLanguage) {
        setState(() {
          _currentLanguage = remoteLang;
          _controller.language = _getHighlightLanguage(_currentLanguage);
        });
      }

      _applyRemoteText(remoteCode);
    });
  }

  void _onLocalChange() {
    if (_suppressLocalEmit) return;

    widget.onChanged?.call(_controller.text, _currentLanguage);

    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 300), () {
      widget.socketService.sendCode(_controller.text, _currentLanguage);
    });
  }

  void _applyRemoteText(String newText) {
    if (newText == _controller.text) return;
    _suppressLocalEmit = true;

    // try to preserve selection roughly
    final oldSel = _controller.selection;
    final oldBase = oldSel.baseOffset.clamp(0, _controller.text.length);
    final oldExtent = oldSel.extentOffset.clamp(0, _controller.text.length);

    _controller.text = newText;

    final maxLen = newText.length;
    final base = oldBase.clamp(0, maxLen);
    final extent = oldExtent.clamp(0, maxLen);

    _controller.selection = TextSelection(baseOffset: base, extentOffset: extent);

    Future.microtask(() => _suppressLocalEmit = false);
  }

  @override
  void didUpdateWidget(covariant CodeEditor oldWidget) {
    super.didUpdateWidget(oldWidget);

    if (widget.initialCode != oldWidget.initialCode && widget.initialCode != _controller.text) {
      _applyRemoteText(widget.initialCode);
    }

    if (widget.language != oldWidget.language && widget.language != _currentLanguage) {
      setState(() {
        _currentLanguage = widget.language;
        _controller.language = _getHighlightLanguage(_currentLanguage);
      });

      // broadcast language change to peers
      widget.socketService.sendCode(_controller.text, _currentLanguage);
    }
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _controller.removeListener(_onLocalChange);
    _controller.dispose();
    _codeUpdateSub?.cancel();
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
              textStyle: GoogleFonts.firaCode(fontSize: 14),
              background: kCardColor,
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
        underline: const SizedBox.shrink(),
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
          // emit new language along with current code
          widget.socketService.sendCode(_controller.text, _currentLanguage);
          widget.onChanged?.call(_controller.text, _currentLanguage);
        },
      ),
    );
  }

  static final _languages = {
    'javascript': javascript,
    'python': python,
    'cpp': cpp,
    'java': java,
  };

  static dynamic _getHighlightLanguage(String lang) => _languages[lang] ?? javascript;
}
