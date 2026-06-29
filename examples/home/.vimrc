let s:dot = getenv('DOT_HOME')
if empty(s:dot)
  let s:dot = expand('~/dot')
endif

execute 'source ' . fnameescape(s:dot . '/vim/init.vim')
