function interpolate(template, params = {}) {
  return String(template || "").replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? ""));
}

const UI_STRINGS = Object.freeze({
  ru: {
    mode_map: "Map",
    mode_timeline: "Timeline",
    mode_archive: "Archive",
    mode_homebrew: "Homebrew",
    mode_heroes: "Hall of Heroes",
    mode_active_map: "Active Map",
    sidebar_layers: "\u0421\u043b\u043e\u0438",
    sidebar_events: "\u0421\u043e\u0431\u044b\u0442\u0438\u044f",
    sidebar_sections: "\u0420\u0430\u0437\u0434\u0435\u043b\u044b",
    sidebar_active: "\u0410\u043a\u0442\u0438\u0432",
    rename_world_button: "\u041c\u0438\u0440",
    rename_world_title: "\u041f\u0435\u0440\u0435\u0438\u043c\u0435\u043d\u043e\u0432\u0430\u0442\u044c \u043c\u0438\u0440",
    timeline_subtitle: "\u0414\u0432\u0438\u0433\u0430\u0439\u0441\u044f \u043f\u043e \u0441\u043e\u0431\u044b\u0442\u0438\u044f\u043c \u0447\u0435\u0440\u0435\u0437 \u043d\u0438\u0436\u043d\u044e\u044e \u0448\u043a\u0430\u043b\u0443 \u0438 \u0441\u043b\u0435\u0434\u0438 \u0437\u0430 \u0442\u0435\u043c, \u043a\u0430\u043a \u0440\u0430\u0437\u0432\u043e\u0440\u0430\u0447\u0438\u0432\u0430\u0435\u0442\u0441\u044f \u0445\u0440\u043e\u043d\u0438\u043a\u0430 \u043c\u0438\u0440\u0430.",
    timeline_scroll_aria: "\u041f\u0440\u043e\u043a\u0440\u0443\u0442\u043a\u0430 \u0442\u0430\u0439\u043c\u043b\u0430\u0439\u043d\u0430",
    timeline_overview: "\u041e\u0431\u0449\u0435\u0435",
    timeline_add_act: "+ \u0410\u043a\u0442",
    timeline_future: "\u041d\u0435\u0438\u0437\u0432\u0435\u0434\u0430\u043d\u043d\u043e\u0435 \u0431\u0443\u0434\u0443\u0449\u0435\u0435",
    timeline_act_label: "\u0410\u043a\u0442 {index}",
    timeline_act_subtitle: "\u0410\u0440\u043a\u0430 \u00ab{title}\u00bb",
    add_language: "+ \u042f\u0437\u044b\u043a",
    delete_language: "\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u044f\u0437\u044b\u043a",
    show_language_button: "\u041f\u043e\u043a\u0430\u0437\u0430\u0442\u044c \u043a\u043d\u043e\u043f\u043a\u0443",
    hide_language_button: "\u0421\u043a\u0440\u044b\u0442\u044c \u043a\u043d\u043e\u043f\u043a\u0443",
    show_language: "\u041f\u043e\u043a\u0430\u0437\u0430\u0442\u044c",
    hide_language: "\u0421\u043a\u0440\u044b\u0442\u044c",
    language_hidden: "\u0421\u043a\u0440\u044b\u0442",
    prompt_language_code: "\u041a\u043e\u0434 \u044f\u0437\u044b\u043a\u0430",
    prompt_language_name: "\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435 \u044f\u0437\u044b\u043a\u0430",
    confirm_delete_language: "\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u044f\u0437\u044b\u043a \"{label}\"? \u042d\u0442\u043e \u0441\u043e\u0442\u0440\u0451\u0442 \u0435\u0433\u043e \u0441\u043b\u043e\u0439 \u043f\u0435\u0440\u0435\u0432\u043e\u0434\u0430.",
    alert_default_language_delete: "\u041d\u0435\u043b\u044c\u0437\u044f \u0443\u0434\u0430\u043b\u0438\u0442\u044c \u044f\u0437\u044b\u043a \u043f\u043e \u0443\u043c\u043e\u043b\u0447\u0430\u043d\u0438\u044e.",
    alert_keep_one_language_visible: "\u0414\u043b\u044f \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u0435\u0439 \u0434\u043e\u043b\u0436\u0435\u043d \u043e\u0441\u0442\u0430\u0442\u044c\u0441\u044f \u0432\u0438\u0434\u0438\u043c\u044b\u043c \u0445\u043e\u0442\u044f \u0431\u044b \u043e\u0434\u0438\u043d \u044f\u0437\u044b\u043a.",
    prompt_world_name: "\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435 \u043c\u0438\u0440\u0430",
    alert_world_name_empty: "\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435 \u043c\u0438\u0440\u0430 \u043d\u0435 \u043c\u043e\u0436\u0435\u0442 \u0431\u044b\u0442\u044c \u043f\u0443\u0441\u0442\u044b\u043c.",
    world_renamed_subtitle: "\u0411\u0440\u0435\u043d\u0434\u0438\u043d\u0433 \u043c\u0438\u0440\u0430 \u043e\u0431\u043d\u043e\u0432\u043b\u0451\u043d",
    world_renamed_text: "\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435 \u043c\u0438\u0440\u0430 \u0441\u043c\u0435\u043d\u0438\u043b\u043e\u0441\u044c \u043d\u0430 \"{name}\". \u042d\u043a\u0441\u043f\u043e\u0440\u0442\u0438\u0440\u0443\u0439 JSON, \u0447\u0442\u043e\u0431\u044b \u043f\u0435\u0440\u0435\u043d\u0435\u0441\u0442\u0438 \u044d\u0442\u043e \u0438\u043c\u044f \u0432 \u0434\u0440\u0443\u0433\u043e\u0439 \u0437\u0430\u043f\u0443\u0441\u043a \u0438\u043b\u0438 \u043f\u0440\u043e\u0435\u043a\u0442.",
    loading_note_prepare: "\u041f\u043e\u0434\u0433\u043e\u0442\u0430\u0432\u043b\u0438\u0432\u0430\u0435\u043c \u043a\u0430\u0440\u0442\u0443 \u043c\u0438\u0440\u0430 \"{name}\", \u0433\u0435\u0440\u043e\u0435\u0432, \u0430\u043a\u0442\u0438\u0432\u043d\u044b\u0435 \u0441\u043e\u0431\u044b\u0442\u0438\u044f \u0438 \u0432\u0441\u0451, \u0447\u0442\u043e \u0432\u044b \u0443\u0441\u043f\u0435\u043b\u0438 \u043d\u0430\u0442\u0432\u043e\u0440\u0438\u0442\u044c.",
    loading_note_ready: "\u041a\u0430\u0440\u0442\u0430 \u043c\u0438\u0440\u0430 \"{name}\" \u043d\u0430 \u043c\u0435\u0441\u0442\u0435. \u0425\u0440\u043e\u043d\u0438\u043a\u0430 \u043e\u0442\u043a\u0440\u044b\u0442\u0430. \u041f\u043e\u0440\u0430 \u0432\u043e\u0437\u0432\u0440\u0430\u0449\u0430\u0442\u044c\u0441\u044f \u0432 \u043c\u0438\u0440.",
    loading_fail_kicker: "\u0425\u0440\u043e\u043d\u0438\u043a\u0430 \u043f\u0440\u0435\u0440\u0432\u0430\u043d\u0430",
    loading_fail_subtitle: "\u041f\u0440\u043e\u0432\u0435\u0440\u044c JSON \u0438 \u043a\u043e\u043d\u0441\u043e\u043b\u044c \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0430, \u0430 \u044f \u043f\u043e\u043a\u0430 \u043d\u0435 \u0431\u0443\u0434\u0443 \u0434\u0435\u043b\u0430\u0442\u044c \u0432\u0438\u0434, \u0447\u0442\u043e \u0432\u0441\u0451 \u0432 \u043f\u043e\u0440\u044f\u0434\u043a\u0435.",
    loading_fail_note: "\u042d\u043a\u0440\u0430\u043d \u0435\u0449\u0451 \u043d\u0435\u043c\u043d\u043e\u0433\u043e \u0437\u0430\u0434\u0435\u0440\u0436\u0438\u0442\u0441\u044f, \u0447\u0442\u043e\u0431\u044b \u043e\u0448\u0438\u0431\u043a\u0430 \u043d\u0435 \u0432\u044b\u0433\u043b\u044f\u0434\u0435\u043b\u0430 \u043a\u0430\u043a \u0441\u043b\u0443\u0447\u0430\u0439\u043d\u044b\u0439 \u043c\u0438\u0433.",
    load_error_console: "\u041e\u0448\u0438\u0431\u043a\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0438 \u0434\u0430\u043d\u043d\u044b\u0445:",
    edit_loading_screen: "\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430",
    preview_loading_screen: "\u041f\u0440\u0435\u0432\u044c\u044e \u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0438",
    loading_editor_title: "\u0420\u0435\u0434\u0430\u043a\u0442\u043e\u0440 \u044d\u043a\u0440\u0430\u043d\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0438",
    loading_editor_save: "\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c",
    loading_editor_add_line: "+ \u0424\u0440\u0430\u0437\u0430",
    loading_editor_remove_line: "\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u0444\u0440\u0430\u0437\u0443",
    prompt_loading_kicker: "\u041a\u0438\u043a\u0435\u0440 \u0437\u0430\u0433\u0440\u0443\u0437\u043e\u0447\u043d\u043e\u0433\u043e \u044d\u043a\u0440\u0430\u043d\u0430",
    prompt_loading_title: "\u0417\u0430\u0433\u043e\u043b\u043e\u0432\u043e\u043a \u0437\u0430\u0433\u0440\u0443\u0437\u043e\u0447\u043d\u043e\u0433\u043e \u044d\u043a\u0440\u0430\u043d\u0430",
    prompt_loading_prepare_note: "\u041d\u0438\u0436\u043d\u0438\u0439 \u0442\u0435\u043a\u0441\u0442 \u0432\u043e \u0432\u0440\u0435\u043c\u044f \u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0438",
    prompt_loading_ready_note: "\u041d\u0438\u0436\u043d\u0438\u0439 \u0442\u0435\u043a\u0441\u0442 \u043f\u0435\u0440\u0435\u0434 \u0441\u043a\u0440\u044b\u0442\u0438\u0435\u043c \u044d\u043a\u0440\u0430\u043d\u0430",
    prompt_loading_fail_title: "\u0417\u0430\u0433\u043e\u043b\u043e\u0432\u043e\u043a \u043e\u0448\u0438\u0431\u043a\u0438 \u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0438",
    prompt_loading_fail_subtitle: "\u041f\u043e\u0434\u0437\u0430\u0433\u043e\u043b\u043e\u0432\u043e\u043a \u043e\u0448\u0438\u0431\u043a\u0438 \u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0438",
    prompt_loading_fail_note: "\u041d\u0438\u0436\u043d\u0438\u0439 \u0442\u0435\u043a\u0441\u0442 \u043e\u0448\u0438\u0431\u043a\u0438 \u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0438",
    prompt_loading_flavor_lines: "\u0424\u0440\u0430\u0437\u044b \u0437\u0430\u0433\u0440\u0443\u0437\u043e\u0447\u043d\u043e\u0433\u043e \u044d\u043a\u0440\u0430\u043d\u0430, \u043a\u0430\u0436\u0434\u0430\u044f \u0441 \u043d\u043e\u0432\u043e\u0439 \u0441\u0442\u0440\u043e\u043a\u0438",
    loading_editor_updated_subtitle: "\u0417\u0430\u0433\u0440\u0443\u0437\u043e\u0447\u043d\u044b\u0439 \u044d\u043a\u0440\u0430\u043d \u043e\u0431\u043d\u043e\u0432\u043b\u0451\u043d",
    loading_editor_updated_text: "\u0422\u0435\u043a\u0441\u0442\u044b \u0438 \u0444\u0440\u0430\u0437\u044b \u044d\u043a\u0440\u0430\u043d\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0438 \u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u044b \u0434\u043b\u044f \u0442\u0435\u043a\u0443\u0449\u0435\u0433\u043e \u044f\u0437\u044b\u043a\u0430.",
    error_title: "\u041e\u0448\u0438\u0431\u043a\u0430",
    error_subtitle: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c JSON",
    error_text: "\u041f\u0440\u043e\u0432\u0435\u0440\u044c \u043f\u0443\u0442\u0438 \u043a \u0444\u0430\u0439\u043b\u0430\u043c data/markers.json, data/timeline.json, data/archive.json \u0438 data/heroes.json.",
    error_fact_1: "\u041f\u0430\u043f\u043a\u0430 data \u0434\u043e\u043b\u0436\u043d\u0430 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u043e\u0432\u0430\u0442\u044c",
    error_fact_2: "JSON \u0434\u043e\u043b\u0436\u0435\u043d \u0431\u044b\u0442\u044c \u0432\u0430\u043b\u0438\u0434\u043d\u044b\u043c",
    error_fact_3: "\u0421\u043c\u043e\u0442\u0440\u0438 \u043a\u043e\u043d\u0441\u043e\u043b\u044c \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0430",
    search_title: "\u041f\u043e\u0438\u0441\u043a \u043f\u043e \u043c\u0438\u0440\u0443",
    homebrew_search_placeholder: "\u041f\u043e\u0438\u0441\u043a \u043f\u043e homebrew",
    homebrew_type_change: "\u0418\u0437\u043c\u0435\u043d\u0435\u043d\u0438\u044f",
    homebrew_type_new: "\u041d\u043e\u0432\u043e\u0435",
    homebrew_type_rule: "\u041f\u0440\u0430\u0432\u0438\u043b\u0430",
    homebrew_all_categories: "\u0412\u0441\u0451",
    homebrew_add_category: "+ \u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u044f",
    homebrew_add_article: "+ \u0421\u0442\u0430\u0442\u044c\u044f",
    homebrew_edit: "\u0420\u0435\u0434\u0430\u043a\u0442\u0438\u0440\u043e\u0432\u0430\u0442\u044c",
    homebrew_edit_done: "\u0413\u043e\u0442\u043e\u0432\u043e",
    homebrew_delete: "\u0423\u0434\u0430\u043b\u0438\u0442\u044c",
    homebrew_field_type: "\u0422\u0438\u043f",
    homebrew_field_title: "\u0417\u0430\u0433\u043e\u043b\u043e\u0432\u043e\u043a",
    homebrew_field_summary: "\u041a\u0440\u0430\u0442\u043a\u043e\u0435 \u043e\u043f\u0438\u0441\u0430\u043d\u0438\u0435",
    homebrew_field_content: "\u041f\u043e\u043b\u043d\u044b\u0439 \u0442\u0435\u043a\u0441\u0442",
    homebrew_field_source: "URL \u0438\u0441\u0442\u043e\u0447\u043d\u0438\u043a\u0430",
    homebrew_field_categories: "\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u0438",
    homebrew_add_section: "+ \u0420\u0430\u0437\u0434\u0435\u043b",
    homebrew_add_table: "+ \u0422\u0430\u0431\u043b\u0438\u0446\u0430",
    homebrew_add_category_inline: "+",
    homebrew_remove_category_inline: "\u0423\u0431\u0440\u0430\u0442\u044c \u043a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u044e",
    homebrew_section_fallback_title: "\u0420\u0430\u0437\u0434\u0435\u043b",
    homebrew_table_fallback_title: "\u0422\u0430\u0431\u043b\u0438\u0446\u0430",
    homebrew_source_label: "\u041e\u0440\u0438\u0433\u0438\u043d\u0430\u043b \u0438\u043b\u0438 \u0438\u0441\u0442\u043e\u0447\u043d\u0438\u043a",
    homebrew_source_open: "\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u0441\u0441\u044b\u043b\u043a\u0443",
    homebrew_source_missing: "\u0421\u0441\u044b\u043b\u043a\u0443 \u043d\u0430 \u043e\u0440\u0438\u0433\u0438\u043d\u0430\u043b \u043c\u043e\u0436\u043d\u043e \u0434\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u043f\u043e\u0437\u0436\u0435.",
    homebrew_empty_title: "\u041f\u043e\u043a\u0430 \u0437\u0434\u0435\u0441\u044c \u043f\u0443\u0441\u0442\u043e",
    homebrew_empty_text: "\u0421\u0442\u0430\u0442\u044c\u0438 \u043f\u043e\u044f\u0432\u044f\u0442\u0441\u044f \u0437\u0434\u0435\u0441\u044c, \u043a\u043e\u0433\u0434\u0430 \u0440\u0435\u0434\u0430\u043a\u0442\u043e\u0440 \u0434\u043e\u0431\u0430\u0432\u0438\u0442 \u043f\u0435\u0440\u0432\u044b\u0439 homebrew-\u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b.",
    prompt_homebrew_category_title: "\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435 \u043a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u0438",
    prompt_homebrew_article_type: "\u0422\u0438\u043f \u0441\u0442\u0430\u0442\u044c\u0438: change / new / rule",
    prompt_homebrew_article_title: "\u0417\u0430\u0433\u043e\u043b\u043e\u0432\u043e\u043a \u0441\u0442\u0430\u0442\u044c\u0438",
    prompt_homebrew_article_summary: "\u041a\u043e\u0440\u043e\u0442\u043a\u043e\u0435 \u043e\u043f\u0438\u0441\u0430\u043d\u0438\u0435",
    prompt_homebrew_article_content: "\u041f\u043e\u043b\u043d\u044b\u0439 \u0442\u0435\u043a\u0441\u0442 \u0441\u0442\u0430\u0442\u044c\u0438",
    prompt_homebrew_article_source: "URL \u043d\u0430 \u043e\u0440\u0438\u0433\u0438\u043d\u0430\u043b \u0438\u043b\u0438 \u0438\u0441\u0442\u043e\u0447\u043d\u0438\u043a",
    prompt_homebrew_article_categories: "\u041d\u043e\u043c\u0435\u0440\u0430 \u043a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u0439 \u0447\u0435\u0440\u0435\u0437 \u0437\u0430\u043f\u044f\u0442\u0443\u044e. 0 \u2014 \u0431\u0435\u0437 \u043a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u0438.\n{list}",
    alert_homebrew_type_invalid: "\u0418\u0441\u043f\u043e\u043b\u044c\u0437\u0443\u0439 \u043e\u0434\u0438\u043d \u0438\u0437 \u0442\u0438\u043f\u043e\u0432: change, new \u0438\u043b\u0438 rule.",
    confirm_homebrew_delete_category: "\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u043a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u044e \"{label}\"? \u041e\u043d\u0430 \u0441\u043d\u0438\u043c\u0435\u0442\u0441\u044f \u0441 \u043f\u0440\u0438\u0432\u044f\u0437\u0430\u043d\u043d\u044b\u0445 \u0441\u0442\u0430\u0442\u0435\u0439.",
    confirm_homebrew_delete_article: "\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u0441\u0442\u0430\u0442\u044c\u044e \"{label}\"?",
    map_view_author: "\u0410\u0432\u0442\u043e\u0440\u0441\u043a\u0438\u0439",
    map_view_vector: "\u0412\u0435\u043a\u0442\u043e\u0440",
    map_view_vector_colored: "\u0412\u0435\u043a\u0442\u043e\u0440 + \u0446\u0432\u0435\u0442",
    map_views_hide_for_users: "\u0421\u043a\u0440\u044b\u0442\u044c \u0443 \u0438\u0433\u0440\u043e\u043a\u043e\u0432",
    map_views_show_for_users: "\u041f\u043e\u043a\u0430\u0437\u0430\u0442\u044c \u0438\u0433\u0440\u043e\u043a\u0430\u043c",
    map_views_manage: "\u0420\u0435\u0436\u0438\u043c\u044b \u043a\u0430\u0440\u0442\u044b",
    map_views_delete: "\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u0440\u0435\u0436\u0438\u043c",
    map_views_pick_edit: "\u041a\u0430\u043a\u043e\u0439 \u0440\u0435\u0436\u0438\u043c \u043a\u0430\u0440\u0442\u044b \u0438\u0437\u043c\u0435\u043d\u0438\u0442\u044c?",
    map_views_pick_delete: "\u041a\u0430\u043a\u043e\u0439 \u0440\u0435\u0436\u0438\u043c \u043a\u0430\u0440\u0442\u044b \u0443\u0434\u0430\u043b\u0438\u0442\u044c?",
    map_views_add_option: "+ \u041d\u043e\u0432\u044b\u0439 \u0440\u0435\u0436\u0438\u043c",
    map_views_prompt_id: "ID \u0440\u0435\u0436\u0438\u043c\u0430",
    map_views_prompt_label: "\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435 \u0440\u0435\u0436\u0438\u043c\u0430",
    map_views_prompt_texture: "\u041a\u043b\u044e\u0447 \u0442\u0435\u043a\u0441\u0442\u0443\u0440\u044b \u0434\u043b\u044f \u044d\u0442\u043e\u0433\u043e \u0440\u0435\u0436\u0438\u043c\u0430",
    map_views_prompt_visible: "\u041f\u043e\u043a\u0430\u0437\u044b\u0432\u0430\u0442\u044c \u0438\u0433\u0440\u043e\u043a\u0430\u043c? y/n",
    map_views_keep_one: "\u041d\u0443\u0436\u043d\u043e \u043e\u0441\u0442\u0430\u0432\u0438\u0442\u044c \u0445\u043e\u0442\u044f \u0431\u044b \u043e\u0434\u0438\u043d \u0440\u0435\u0436\u0438\u043c \u043a\u0430\u0440\u0442\u044b.",
    map_views_confirm_delete: "\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u0440\u0435\u0436\u0438\u043c \"{label}\"?",
    upload_map_texture: "\u0417\u0430\u043b\u0438\u0432\u043a\u0430 \u043a\u0430\u0440\u0442\u044b",
    export_json: "\u042d\u043a\u0441\u043f\u043e\u0440\u0442 JSON",
    import_json: "\u0418\u043c\u043f\u043e\u0440\u0442 JSON",
    export_active_map: "\u042d\u043a\u0441\u043f\u043e\u0440\u0442 Active Map",
    panel_subtitle_default: "\u0418\u043d\u0444\u043e\u043f\u0430\u043d\u0435\u043b\u044c",
    delete_marker: "\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u043c\u0435\u0442\u043a\u0443",
    image_caption_placeholder: "\u0417\u0434\u0435\u0441\u044c \u043c\u043e\u0436\u0435\u0442 \u0431\u044b\u0442\u044c \u043f\u043e\u0440\u0442\u0440\u0435\u0442, \u0433\u0435\u0440\u0431, \u043a\u0430\u0440\u0442\u0430 \u0440\u0435\u0433\u0438\u043e\u043d\u0430 \u0438\u043b\u0438 \u0438\u043b\u043b\u044e\u0441\u0442\u0440\u0430\u0446\u0438\u044f.",
    apply_image_url: "\u041f\u0440\u0438\u043c\u0435\u043d\u0438\u0442\u044c URL",
    upload_file: "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u0444\u0430\u0439\u043b",
    link_timeline: "\u0421\u0432\u044f\u0437\u0430\u0442\u044c \u0441 \u0442\u0430\u0439\u043c\u043b\u0430\u0439\u043d\u043e\u043c",
    link_archive: "\u0421\u0432\u044f\u0437\u0430\u0442\u044c \u0441 \u0430\u0440\u0445\u0438\u0432\u043e\u043c",
    image_hint: "\u041c\u043e\u0436\u043d\u043e \u0432\u0441\u0442\u0430\u0432\u0438\u0442\u044c URL \u0438\u043b\u0438 \u043f\u0435\u0440\u0435\u0442\u0430\u0449\u0438\u0442\u044c \u0444\u0430\u0439\u043b \u043d\u0430 \u043f\u0440\u0435\u0432\u044c\u044e.",
    panel_text_default: "\u042d\u0442\u043e \u0438\u043d\u0444\u043e\u043f\u0430\u043d\u0435\u043b\u044c. \u041d\u0430\u0436\u043c\u0438 \u043d\u0430 \u043c\u0435\u0442\u043a\u0443 \u043d\u0430 \u043a\u0430\u0440\u0442\u0435, \u0438 \u0437\u0434\u0435\u0441\u044c \u043f\u043e\u044f\u0432\u0438\u0442\u0441\u044f \u0438\u043d\u0444\u043e\u0440\u043c\u0430\u0446\u0438\u044f.",
    open_timeline_event: "\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u0441\u043e\u0431\u044b\u0442\u0438\u0435 \u043d\u0430 \u0442\u0430\u0439\u043c\u043b\u0430\u0439\u043d\u0435",
    fact_label_1: "\u0424\u0430\u043a\u0442 1",
    fact_label_2: "\u0424\u0430\u043a\u0442 2",
    fact_label_3: "\u0424\u0430\u043a\u0442 3",
    heroes_home: "\u0414\u043e\u043c\u043e\u0439",
    favorites_title: "\u0418\u0437\u0431\u0440\u0430\u043d\u043d\u043e\u0435",
    favorites_hint: "\u0421\u043e\u0445\u0440\u0430\u043d\u044f\u0439 \u0432\u0430\u0436\u043d\u044b\u0435 \u043c\u0435\u0442\u043a\u0438, \u0433\u043b\u0430\u0432\u044b \u0430\u0440\u0445\u0438\u0432\u0430 \u0438 \u0441\u043e\u0431\u044b\u0442\u0438\u044f, \u0447\u0442\u043e\u0431\u044b \u0432\u043e\u0437\u0432\u0440\u0430\u0449\u0430\u0442\u044c\u0441\u044f \u043a \u043d\u0438\u043c \u0432 \u043e\u0434\u0438\u043d \u043a\u043b\u0438\u043a.",
    favorites_add: "\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c \u0442\u0435\u043a\u0443\u0449\u0435\u0435 \u043c\u0435\u0441\u0442\u043e",
    players_title: "\u0418\u0433\u0440\u043e\u043a\u0438",
    players_copy: "\u041a\u0442\u043e \u0441\u0438\u0434\u0438\u0442 \u0437\u0430 \u0441\u0442\u043e\u043b\u043e\u043c \u0438 \u043a\u0430\u043a\u0438\u043c\u0438 \u0433\u0435\u0440\u043e\u044f\u043c\u0438 \u043e\u043d\u0438 \u0441\u0435\u0439\u0447\u0430\u0441 \u0438\u0433\u0440\u0430\u044e\u0442.",
    players_editor_hint: "\u0412 \u0440\u0435\u0434\u0430\u043a\u0442\u043e\u0440\u0435 \u0437\u0434\u0435\u0441\u044c \u043c\u043e\u0436\u043d\u043e \u0434\u043e\u0431\u0430\u0432\u043b\u044f\u0442\u044c \u0438\u0433\u0440\u043e\u043a\u043e\u0432 \u0438 \u043f\u0440\u0438\u0432\u044f\u0437\u044b\u0432\u0430\u0442\u044c \u0438\u0445 \u043a \u0433\u0435\u0440\u043e\u044f\u043c.",
    players_add: "+ \u0418\u0433\u0440\u043e\u043a",
    notes_title: "\u0417\u0430\u043c\u0435\u0442\u043a\u0438",
    notes_copy: "\u041b\u0438\u0447\u043d\u044b\u0439 \u0431\u043b\u043e\u043a\u043d\u043e\u0442 \u0438\u0433\u0440\u043e\u043a\u0430. \u0425\u0440\u0430\u043d\u0438\u0442\u0441\u044f \u0442\u043e\u043b\u044c\u043a\u043e \u0432 \u044d\u0442\u043e\u043c \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0435.",
    notes_placeholder: "\u0417\u0430\u043f\u0438\u0448\u0438 \u0437\u0430\u0446\u0435\u043f\u043a\u0438, \u0438\u043c\u0435\u043d\u0430, \u0434\u043e\u043b\u0433\u0438, \u0442\u0435\u043e\u0440\u0438\u0438, NPC \u0438 \u0442\u043e, \u0447\u0442\u043e \u043d\u0435\u043b\u044c\u0437\u044f \u0437\u0430\u0431\u044b\u0442\u044c \u043a \u0441\u043b\u0435\u0434\u0443\u044e\u0449\u0435\u0439 \u0441\u0435\u0441\u0441\u0438\u0438...",
    notes_status: "\u041f\u0443\u0441\u0442\u043e, \u043d\u043e \u0443\u0436\u0435 \u0436\u0434\u0451\u0442 \u0432\u0435\u043b\u0438\u043a\u0438\u0445 \u043e\u0442\u043a\u0440\u044b\u0442\u0438\u0439.",
    notes_clear: "\u041e\u0447\u0438\u0441\u0442\u0438\u0442\u044c",
    heroes_player_single: "\u0418\u0433\u0440\u043e\u043a",
    heroes_player_plural: "\u0418\u0433\u0440\u043e\u043a\u0438",
    heroes_add_portrait: "\u0414\u043e\u0431\u0430\u0432\u044c \u043f\u043e\u0440\u0442\u0440\u0435\u0442 \u0433\u0435\u0440\u043e\u044f",
    heroes_accent: "\u0410\u043a\u0446\u0435\u043d\u0442",
    heroes_accent_title: "\u0420\u0443\u0447\u043d\u043e\u0439 \u0446\u0432\u0435\u0442 \u043a\u0430\u0440\u0442\u043e\u0447\u043a\u0438 \u0433\u0435\u0440\u043e\u044f",
    heroes_auto: "\u0410\u0432\u0442\u043e",
    heroes_auto_title: "\u0421\u0431\u0440\u043e\u0441\u0438\u0442\u044c \u0440\u0443\u0447\u043d\u043e\u0439 \u0446\u0432\u0435\u0442 \u0438 \u0441\u043d\u043e\u0432\u0430 \u0432\u0437\u044f\u0442\u044c \u043e\u0442\u0442\u0435\u043d\u043e\u043a \u0438\u0437 \u0438\u0437\u043e\u0431\u0440\u0430\u0436\u0435\u043d\u0438\u044f",
    heroes_open: "\u0420\u0430\u0441\u043a\u0440\u044b\u0442\u044c",
    heroes_new_hero: "\u041d\u043e\u0432\u044b\u0439 \u0433\u0435\u0440\u043e\u0439",
    heroes_role: "\u0420\u043e\u043b\u044c \u0432 \u0445\u0440\u043e\u043d\u0438\u043a\u0435",
    heroes_description_short: "\u041a\u043e\u0440\u043e\u0442\u043a\u043e\u0435 \u043e\u043f\u0438\u0441\u0430\u043d\u0438\u0435 \u0433\u0435\u0440\u043e\u044f.",
    heroes_new_group: "\u041d\u043e\u0432\u0430\u044f \u0433\u0440\u0443\u043f\u043f\u0430",
    heroes_group_description: "\u041e\u043f\u0438\u0441\u0430\u043d\u0438\u0435 \u0433\u0440\u0443\u043f\u043f\u044b \u0433\u0435\u0440\u043e\u0435\u0432.",
    heroes_close: "\u0421\u043a\u0440\u044b\u0442\u044c",
    heroes_description_full: "\u041f\u043e\u0434\u0440\u043e\u0431\u043d\u043e\u0435 \u043e\u043f\u0438\u0441\u0430\u043d\u0438\u0435 \u0433\u0435\u0440\u043e\u044f.",
    heroes_related_record: "\u0421\u0432\u044f\u0437\u0430\u043d\u043d\u0430\u044f \u0437\u0430\u043f\u0438\u0441\u044c",
    heroes_link_navigate_title: "\u041f\u0435\u0440\u0435\u0439\u0442\u0438 \u043a \u0441\u0432\u044f\u0437\u0430\u043d\u043d\u043e\u0439 \u0437\u0430\u043f\u0438\u0441\u0438",
    heroes_link_edit_title: "\u041a\u043b\u0438\u043a: \u043f\u0435\u0440\u0435\u0439\u0442\u0438 • Alt+\u043a\u043b\u0438\u043a: \u0443\u0434\u0430\u043b\u0438\u0442\u044c \u0441\u0432\u044f\u0437\u044c",
    heroes_add_link: "+ \u0421\u0432\u044f\u0437\u044c",
    marker_untitled: "\u0411\u0435\u0437 \u043d\u0430\u0437\u0432\u0430\u043d\u0438\u044f",
    marker_type: "\u041c\u0435\u0442\u043a\u0430",
    marker_description_empty: "\u041e\u043f\u0438\u0441\u0430\u043d\u0438\u0435 \u043f\u043e\u043a\u0430 \u043d\u0435 \u0434\u043e\u0431\u0430\u0432\u043b\u0435\u043d\u043e.",
    timeline_event: "\u0421\u043e\u0431\u044b\u0442\u0438\u0435",
    archive_record: "\u0437\u0430\u043f\u0438\u0441\u044c",
    link_archive_pick: "\u041a \u043a\u0430\u043a\u043e\u0439 \u0430\u0440\u0445\u0438\u0432\u043d\u043e\u0439 \u043a\u0430\u0440\u0442\u043e\u0447\u043a\u0435 \u043f\u0440\u0438\u0432\u044f\u0437\u0430\u0442\u044c \u044d\u0442\u0443 \u043c\u0435\u0442\u043a\u0443?\n{list}",
    link_archive_empty: "\u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u0441\u043e\u0437\u0434\u0430\u0439 \u0445\u043e\u0442\u044f \u0431\u044b \u043e\u0434\u043d\u0443 \u0444\u0440\u0430\u043a\u0446\u0438\u043e\u043d\u043d\u0443\u044e \u043a\u0430\u0440\u0442\u043e\u0447\u043a\u0443 \u0432 \u0430\u0440\u0445\u0438\u0432\u0435.",
    link_archive_button: "\u0421\u0432\u044f\u0437\u0430\u0442\u044c \u0441 \u0430\u0440\u0445\u0438\u0432\u043e\u043c",
    link_timeline_pick: "\u041a \u043a\u0430\u043a\u043e\u043c\u0443 \u0441\u043e\u0431\u044b\u0442\u0438\u044e \u043f\u0440\u0438\u0432\u044f\u0437\u0430\u0442\u044c \u044d\u0442\u0443 \u043f\u0430\u043d\u0435\u043b\u044c?\n{list}",
    link_timeline_empty: "\u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u0434\u043e\u0431\u0430\u0432\u044c \u0445\u043e\u0442\u044f \u0431\u044b \u043e\u0434\u043d\u043e \u0441\u043e\u0431\u044b\u0442\u0438\u0435 \u043d\u0430 \u0442\u0430\u0439\u043c\u043b\u0430\u0439\u043d.",
    link_clear: "0. \u0423\u0431\u0440\u0430\u0442\u044c \u0441\u0432\u044f\u0437\u044c",
    link_timeline_button: "\u0421\u0432\u044f\u0437\u0430\u0442\u044c \u0441 \u0442\u0430\u0439\u043c\u043b\u0430\u0439\u043d\u043e\u043c",
    link_timeline_button_title: "\u041f\u0440\u0438\u0432\u044f\u0437\u0430\u0442\u044c \u043f\u0440\u0430\u0432\u0443\u044e \u043f\u0430\u043d\u0435\u043b\u044c \u043a \u0441\u043e\u0431\u044b\u0442\u0438\u044e \u043d\u0430 \u0442\u0430\u0439\u043c\u043b\u0430\u0439\u043d\u0435.",
    link_timeline_button_title_edit: "\u041d\u0430\u0436\u043c\u0438, \u0447\u0442\u043e\u0431\u044b \u0441\u043c\u0435\u043d\u0438\u0442\u044c \u0441\u043e\u0431\u044b\u0442\u0438\u0435. \u0412\u0432\u0435\u0434\u0438 0, \u0447\u0442\u043e\u0431\u044b \u0441\u043d\u044f\u0442\u044c \u0441\u0432\u044f\u0437\u044c.",
    open_linked_timeline_event: "\u041f\u0435\u0440\u0435\u0439\u0442\u0438 \u043a \u0441\u043e\u0431\u044b\u0442\u0438\u044e: {title}",
  },
  en: {
    mode_map: "Map",
    mode_timeline: "Timeline",
    mode_archive: "Archive",
    mode_homebrew: "Homebrew",
    mode_heroes: "Hall of Heroes",
    mode_active_map: "Active Map",
    sidebar_layers: "Layers",
    sidebar_events: "Events",
    sidebar_sections: "Sections",
    sidebar_active: "Active",
    rename_world_button: "World",
    rename_world_title: "Rename world",
    timeline_subtitle: "Move through the events using the lower track and follow how the world's chronicle unfolds.",
    timeline_scroll_aria: "Scroll timeline",
    timeline_overview: "Overview",
    timeline_add_act: "+ Act",
    timeline_future: "Unknown future",
    timeline_act_label: "Act {index}",
    timeline_act_subtitle: "Arc \"{title}\"",
    add_language: "+ Language",
    delete_language: "Delete language",
    show_language_button: "Show button",
    hide_language_button: "Hide button",
    show_language: "Show",
    hide_language: "Hide",
    language_hidden: "Hidden",
    prompt_language_code: "Language code",
    prompt_language_name: "Language name",
    confirm_delete_language: "Delete language \"{label}\"? This will remove its translation layer.",
    alert_default_language_delete: "The default language cannot be deleted.",
    alert_keep_one_language_visible: "At least one language must remain visible for users.",
    prompt_world_name: "World name",
    alert_world_name_empty: "World name cannot be empty.",
    world_renamed_subtitle: "World branding updated",
    world_renamed_text: "The world name is now \"{name}\". Export JSON if you want to move this name into another run or project.",
    loading_note_prepare: "Preparing the map of \"{name}\", the heroes, the active events, and everything you already managed to unleash.",
    loading_note_ready: "The map of \"{name}\" is ready. The chronicle is open. Time to step back into the world.",
    loading_fail_kicker: "Chronicle Interrupted",
    loading_fail_subtitle: "Check the JSON files and the browser console while I stop pretending this is fine.",
    loading_fail_note: "The loading screen still lingers for a moment so the failure does not look like a random flicker.",
    load_error_console: "Data loading error:",
    edit_loading_screen: "Loading screen",
    preview_loading_screen: "Preview loading",
    loading_editor_title: "Loading screen editor",
    loading_editor_save: "Save",
    loading_editor_add_line: "+ Line",
    loading_editor_remove_line: "Remove line",
    prompt_loading_kicker: "Loading screen kicker",
    prompt_loading_title: "Loading screen title",
    prompt_loading_prepare_note: "Lower text while loading",
    prompt_loading_ready_note: "Lower text before the screen fades out",
    prompt_loading_fail_title: "Loading failure title",
    prompt_loading_fail_subtitle: "Loading failure subtitle",
    prompt_loading_fail_note: "Loading failure footer text",
    prompt_loading_flavor_lines: "Loading flavor lines, one per row",
    loading_editor_updated_subtitle: "Loading screen updated",
    loading_editor_updated_text: "The loading screen texts and flavor lines were saved for the current language.",
    error_title: "Error",
    error_subtitle: "Could not load JSON",
    error_text: "Check the paths to data/markers.json, data/timeline.json, data/archive.json, and data/heroes.json.",
    error_fact_1: "The data folder must exist",
    error_fact_2: "JSON must be valid",
    error_fact_3: "Open the browser console",
    search_title: "Search this world",
    homebrew_search_placeholder: "Search homebrew",
    homebrew_type_change: "Changes",
    homebrew_type_new: "New",
    homebrew_type_rule: "Rules",
    homebrew_all_categories: "All",
    homebrew_add_category: "+ Category",
    homebrew_add_article: "+ Article",
    homebrew_edit: "Edit",
    homebrew_edit_done: "Done",
    homebrew_delete: "Delete",
    homebrew_field_type: "Type",
    homebrew_field_title: "Title",
    homebrew_field_summary: "Short description",
    homebrew_field_content: "Full text",
    homebrew_field_source: "Source URL",
    homebrew_field_categories: "Categories",
    homebrew_add_section: "+ Section",
    homebrew_add_table: "+ Table",
    homebrew_add_category_inline: "+",
    homebrew_remove_category_inline: "Remove category",
    homebrew_section_fallback_title: "Section",
    homebrew_table_fallback_title: "Table",
    homebrew_source_label: "Original or source",
    homebrew_source_open: "Open link",
    homebrew_source_missing: "You can add the source link later.",
    homebrew_empty_title: "Nothing here yet",
    homebrew_empty_text: "Articles will appear here once the editor adds the first homebrew entry.",
    prompt_homebrew_category_title: "Category title",
    prompt_homebrew_article_type: "Article type: change / new / rule",
    prompt_homebrew_article_title: "Article title",
    prompt_homebrew_article_summary: "Short description",
    prompt_homebrew_article_content: "Full article text",
    prompt_homebrew_article_source: "Source or original URL",
    prompt_homebrew_article_categories: "Category numbers separated by commas. 0 means no category.\n{list}",
    alert_homebrew_type_invalid: "Use one of these types: change, new, or rule.",
    confirm_homebrew_delete_category: "Delete category \"{label}\"? It will be detached from linked articles.",
    confirm_homebrew_delete_article: "Delete article \"{label}\"?",
    map_view_author: "Author",
    map_view_vector: "Vector",
    map_view_vector_colored: "Vector + color",
    map_views_hide_for_users: "Hide for users",
    map_views_show_for_users: "Show to users",
    map_views_manage: "Map modes",
    map_views_delete: "Delete mode",
    map_views_pick_edit: "Which map mode should be edited?",
    map_views_pick_delete: "Which map mode should be deleted?",
    map_views_add_option: "+ New mode",
    map_views_prompt_id: "Mode ID",
    map_views_prompt_label: "Mode label",
    map_views_prompt_texture: "Texture key for this mode",
    map_views_prompt_visible: "Show to users? y/n",
    map_views_keep_one: "You must keep at least one map mode.",
    map_views_confirm_delete: "Delete map mode \"{label}\"?",
    upload_map_texture: "Map texture",
    export_json: "Export JSON",
    import_json: "Import JSON",
    export_active_map: "Export Active Map",
    panel_subtitle_default: "Information panel",
    delete_marker: "Delete marker",
    image_caption_placeholder: "A portrait, crest, regional map, or point-of-interest illustration can live here.",
    apply_image_url: "Apply URL",
    upload_file: "Upload file",
    link_timeline: "Link to timeline",
    link_archive: "Link to archive",
    image_hint: "You can paste a URL or drag a file onto the preview area.",
    panel_text_default: "This is the info panel. Click any marker on the map and its details will appear here.",
    open_timeline_event: "Open timeline event",
    fact_label_1: "Fact 1",
    fact_label_2: "Fact 2",
    fact_label_3: "Fact 3",
    heroes_home: "Home",
    favorites_title: "Favorites",
    favorites_hint: "Save important markers, archive chapters, and events so you can jump back in one click.",
    favorites_add: "Save current place",
    players_title: "Players",
    players_copy: "Who is at the table and which heroes they are currently playing.",
    players_editor_hint: "In editor mode you can add players here and bind them to heroes.",
    players_add: "+ Player",
    notes_title: "Notes",
    notes_copy: "A private player notebook. Stored only in this browser.",
    notes_placeholder: "Write down leads, names, debts, theories, NPC promises, and anything you should not forget before the next session...",
    notes_status: "Empty for now, but already waiting for major discoveries.",
    notes_clear: "Clear",
    heroes_player_single: "Player",
    heroes_player_plural: "Players",
    heroes_add_portrait: "Add a hero portrait",
    heroes_accent: "Accent",
    heroes_accent_title: "Manual hero card color",
    heroes_auto: "Auto",
    heroes_auto_title: "Reset the manual color and derive the accent from the image again",
    heroes_open: "Open",
    heroes_new_hero: "New hero",
    heroes_role: "Role in the chronicle",
    heroes_description_short: "A short description of the hero.",
    heroes_new_group: "New group",
    heroes_group_description: "A description of this hero group.",
    heroes_close: "Close",
    heroes_description_full: "A fuller description of the hero.",
    heroes_related_record: "Related record",
    heroes_link_navigate_title: "Open related record",
    heroes_link_edit_title: "Click: open • Alt+click: remove link",
    heroes_add_link: "+ Link",
    marker_untitled: "Untitled",
    marker_type: "Marker",
    marker_description_empty: "No description yet.",
    timeline_event: "Event",
    archive_record: "record",
    link_archive_pick: "Which archive card should this marker link to?\n{list}",
    link_archive_empty: "Create at least one faction card in the archive first.",
    link_archive_button: "Link to archive",
    link_timeline_pick: "Which event should this panel link to?\n{list}",
    link_timeline_empty: "Add at least one timeline event first.",
    link_clear: "0. Clear link",
    link_timeline_button: "Link to timeline",
    link_timeline_button_title: "Link the right panel to an event on the timeline.",
    link_timeline_button_title_edit: "Click to change the event. Enter 0 to clear the link.",
    open_linked_timeline_event: "Open event: {title}",
  },
});

export function resolveUiLanguage(context) {
  const raw = String(
    context?.currentLanguage
    || context?.worldData?.defaultLanguage
    || context?.defaultLanguage
    || "ru",
  ).trim().toLowerCase();
  return raw === "en" ? "en" : "ru";
}

export function getUiText(context, key, params = {}) {
  const language = resolveUiLanguage(context);
  const template = UI_STRINGS[language]?.[key] ?? UI_STRINGS.ru[key] ?? key;
  return interpolate(template, params);
}

export function getLoadingFlavorLines(context, worldName) {
  if (resolveUiLanguage(context) === "en") {
    return [
      `Tracing old routes back into ${worldName}.`,
      "Sharpening the map, the rumors, and the trouble spots.",
      "Lifting the archive dust off people, factions, and unfinished promises.",
      "Checking whether anyone rewrote the history of this world overnight.",
      "Putting the table back together one chronicle at a time.",
    ];
  }

  return [
    `\u041d\u0430\u0441\u0442\u0440\u0430\u0438\u0432\u0430\u0435\u043c \u0432\u0440\u0430\u0442\u0430 \u043e\u0431\u0440\u0430\u0442\u043d\u043e \u0432 \u043c\u0438\u0440 \"${worldName}\".`,
    "\u041f\u0440\u0438\u0432\u043e\u0434\u0438\u043c \u0432 \u0447\u0443\u0432\u0441\u0442\u0432\u043e \u043a\u0430\u0440\u0442\u0443, \u0441\u043b\u0443\u0445\u0438 \u0438 \u043f\u0440\u043e\u0431\u043b\u0435\u043c\u043d\u044b\u0435 \u0442\u043e\u0447\u043a\u0438.",
    "\u0421\u043d\u0438\u043c\u0430\u0435\u043c \u043f\u044b\u043b\u044c \u0441 \u0430\u0440\u0445\u0438\u0432\u043e\u0432, \u0433\u0435\u0440\u043e\u0435\u0432 \u0438 \u043d\u0435\u0434\u043e\u0441\u043a\u0430\u0437\u0430\u043d\u043d\u044b\u0445 \u043b\u0435\u0433\u0435\u043d\u0434.",
    "\u041f\u0440\u043e\u0432\u0435\u0440\u044f\u0435\u043c, \u043d\u0435 \u043f\u0435\u0440\u0435\u043f\u0438\u0441\u0430\u043b \u043b\u0438 \u043a\u0442\u043e-\u0442\u043e \u0438\u0441\u0442\u043e\u0440\u0438\u044e \u0437\u0430 \u0432\u0430\u0448\u0435\u0439 \u0441\u043f\u0438\u043d\u043e\u0439.",
    "\u0421\u043e\u0431\u0438\u0440\u0430\u0435\u043c \u0441\u0442\u043e\u043b, \u043f\u0430\u0440\u0442\u0438\u044e \u0438 \u0445\u0440\u043e\u043d\u0438\u043a\u0443 \u043e\u0431\u0440\u0430\u0442\u043d\u043e \u0432\u043c\u0435\u0441\u0442\u0435.",
  ];
}

export function applyUiLocale(els, context) {
  const setText = (element, value) => {
    if (element) element.textContent = value;
  };

  setText(els.renameWorldButton, getUiText(context, "rename_world_button"));
  if (els.renameWorldButton) {
    const title = getUiText(context, "rename_world_title");
    els.renameWorldButton.title = title;
    els.renameWorldButton.setAttribute("aria-label", title);
  }

  setText(els.timelineOpenButton, getUiText(context, "mode_timeline"));
  setText(els.archiveOpenButton, getUiText(context, "mode_archive"));
  setText(els.homebrewOpenButton, getUiText(context, "mode_homebrew"));
  setText(els.heroesOpenButton, getUiText(context, "mode_heroes"));
  setText(els.activeMapToggleButton, getUiText(context, "mode_active_map"));
  setText(els.mapReturnButton, getUiText(context, "mode_map"));
  setText(els.heroesHomeButton, getUiText(context, "heroes_home"));
  setText(els.addLanguageButton, getUiText(context, "add_language"));
  setText(els.deleteLanguageButton, getUiText(context, "delete_language"));
  setText(els.sidebarTitle, getUiText(context, "sidebar_layers"));
  setText(els.uploadMapTextureButton, getUiText(context, "upload_map_texture"));
  setText(els.exportDataButton, getUiText(context, "export_json"));
  setText(els.importDataButton, getUiText(context, "import_json"));
  setText(els.exportActiveMapButton, getUiText(context, "export_active_map"));
  setText(els.editLoadingScreenButton, getUiText(context, "edit_loading_screen"));
  setText(els.previewLoadingScreenButton, getUiText(context, "preview_loading_screen"));
  if (els.globalSearchButton) els.globalSearchButton.title = getUiText(context, "search_title");

  const mapViewButtons = els.mapViewSwitcher?.querySelectorAll?.("[data-map-view]") || [];
  mapViewButtons.forEach((button) => {
    if (button.dataset.mapView === "author") button.textContent = getUiText(context, "map_view_author");
    if (button.dataset.mapView === "vector") button.textContent = getUiText(context, "map_view_vector");
    if (button.dataset.mapView === "vector-colored") button.textContent = getUiText(context, "map_view_vector_colored");
  });

  const timelineTitle = document.querySelector(".timeline-title");
  setText(timelineTitle, getUiText(context, "mode_timeline"));
  setText(els.timelineSubtitle, getUiText(context, "timeline_subtitle"));
  setText(els.addTimelineActButton, getUiText(context, "timeline_add_act"));
  if (els.timelineScrollRange) els.timelineScrollRange.setAttribute("aria-label", getUiText(context, "timeline_scroll_aria"));

  setText(els.sidebarLegendTitle, getUiText(context, "sidebar_layers"));
  setText(document.querySelector("#favoritesPanel h3"), getUiText(context, "favorites_title"));
  setText(els.favoritesHint, getUiText(context, "favorites_hint"));
  setText(els.addFavoriteButton, getUiText(context, "favorites_add"));
  setText(document.querySelector("#playersPanel h3"), getUiText(context, "players_title"));
  setText(document.querySelector("#playersPanel .player-popout-copy"), getUiText(context, "players_copy"));
  setText(els.playersEditorHint, getUiText(context, "players_editor_hint"));
  setText(els.addPlayerButton, getUiText(context, "players_add"));
  setText(document.querySelector("#notesPanel h3"), getUiText(context, "notes_title"));
  setText(document.querySelector("#notesPanel .player-popout-copy"), getUiText(context, "notes_copy"));
  if (els.notesTextarea) els.notesTextarea.placeholder = getUiText(context, "notes_placeholder");
  setText(els.notesStatus, getUiText(context, "notes_status"));
  setText(els.clearNotesButton, getUiText(context, "notes_clear"));
  setText(els.panelSubtitle, getUiText(context, "panel_subtitle_default"));
  setText(els.deleteMarkerButton, getUiText(context, "delete_marker"));
  setText(els.panelImageCaption, getUiText(context, "image_caption_placeholder"));
  setText(els.applyImageUrlButton, getUiText(context, "apply_image_url"));
  setText(document.querySelector("label[for='panelImageFileInput']"), getUiText(context, "upload_file"));
  setText(els.linkTimelineEventButton, getUiText(context, "link_timeline"));
  setText(els.linkArchiveItemButton, getUiText(context, "link_archive"));
  setText(els.panelImageHint, getUiText(context, "image_hint"));
  setText(els.panelText, getUiText(context, "panel_text_default"));
  setText(els.panelTimelineEventButton, getUiText(context, "open_timeline_event"));
  setText(els.fact1, getUiText(context, "fact_label_1"));
  setText(els.fact2, getUiText(context, "fact_label_2"));
  setText(els.fact3, getUiText(context, "fact_label_3"));
}
