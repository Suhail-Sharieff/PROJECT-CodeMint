import 'package:flutter/material.dart';
import 'package:flutter_code_editor/flutter_code_editor.dart';
import 'package:highlight/languages/javascript.dart';
import 'package:highlight/languages/python.dart';
import 'package:highlight/languages/cpp.dart';
import 'package:flutter_highlight/themes/github.dart';

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
  late String _lang;

  Map<String, TextStyle> get theme =>
      githubTheme.map((key, value) => MapEntry(key, value));

  @override
  void initState() {
    super.initState();
    _lang = widget.language;
    _controller = CodeController(
      text: widget.initialCode,
      language: _hl(_lang),
    );
    _controller.addListener(() {
      widget.onChanged?.call(_controller.text, _lang);
    });
  }

  @override
  void didUpdateWidget(covariant CodeEditor oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.initialCode != widget.initialCode &&
        widget.initialCode != _controller.text) {
      _controller.text = widget.initialCode;
    }
    if (oldWidget.language != widget.language) {
      _lang = widget.language;
      _controller.language = _hl(_lang);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Text('Language:'),
            const SizedBox(width: 8),
            DropdownButton<String>(
              value: _lang,
              items: const [
                DropdownMenuItem(
                    value: 'javascript', child: Text('JavaScript')),
                DropdownMenuItem(value: 'python', child: Text('Python')),
                DropdownMenuItem(value: 'cpp', child: Text('C++')),
              ],
              onChanged: widget.readOnly
                  ? null
                  : (v) {
                if (v == null) return;
                setState(() {
                  _lang = v;
                  _controller.language = _hl(_lang);
                });
                widget.onChanged?.call(_controller.text, _lang);
              },
            ),
          ],
        ),
        Expanded(
          child: DecoratedBox(
            decoration: BoxDecoration(
                border: Border.all(color: Theme.of(context).dividerColor)),
            child: CodeTheme(
              data: CodeThemeData(styles: theme),
              child: CodeField(
                controller: _controller,
                readOnly: widget.readOnly,
                textStyle:
                const TextStyle(fontFamily: 'monospace', fontSize: 13),
              ),
            ),
          ),
        ),
      ],
    );
  }

  static var _languages = {
    'javascript': javascript,
    'python': python,
    'cpp': cpp,
  };

  static dynamic _hl(String lang) => _languages[lang] ?? javascript;
}
