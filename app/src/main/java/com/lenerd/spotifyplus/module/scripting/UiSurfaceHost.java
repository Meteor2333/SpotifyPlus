package com.lenerd.spotifyplus.module.scripting;

import android.content.Context;
import android.content.res.ColorStateList;
import android.graphics.Color;
import android.text.InputFilter;
import android.text.InputType;
import android.text.TextUtils;
import android.util.Log;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.inputmethod.EditorInfo;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.CompoundButton;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.HorizontalScrollView;
import android.widget.ImageButton;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.RadioButton;
import android.widget.RelativeLayout;
import android.widget.ScrollView;
import android.widget.SeekBar;
import android.widget.Space;
import android.widget.Switch;
import android.widget.TextView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;

public class UiSurfaceHost {
    private static final String TAG = "SpotifyPlus";

    private final ViewGroup root;
    private final Context context;
    private final Map<Integer, Object> nodes = new HashMap<>();
    private final Map<Integer, JSONObject> nodeProps = new HashMap<>();
    private final Map<Integer, Integer> parentByChild = new HashMap<>();

    public UiSurfaceHost(ViewGroup root) {
        this.root = root;
        this.context = root.getContext();
    }

    public void applyOps(JSONArray ops) {
        try {
            for(int i = 0; i < ops.length(); i++) applyOp(ops.getJSONObject(i));
        } catch(Exception e) {
            Log.e(TAG, "Failed applying UI ops", e);
        }
    }

    private void applyOp(JSONObject op) throws Exception {
        String kind = op.getString("op");
        Log.d(TAG, "applyOp: " + kind);
        Log.d(TAG, op.toString());

        switch(kind) {
            case "createNode":
                createNode(op);
                break;
            case "createText":
                createText(op);
                break;
            case "appendChild":
                appendChild(op);
                break;
            case "appendToRoot":
                appendToRoot(op);
                break;
            case "removeChild":
                removeChild(op);
                break;
            case "removeFromRoot":
                removeFromRoot(op);
                break;
            case "updateProps":
                updateProps(op);
                break;
            case "updateText":
                updateText(op);
                break;
            case "destroyNode":
                destroyNode(op);
                break;
            default:
                Log.w(TAG, "Unknown op " + kind);
                break;
        }
    }

    private void createNode(JSONObject op) throws Exception {
        int id = op.getInt("id");
        String type = op.getString("type");
        JSONObject props = copyJson(op.optJSONObject("props"));

        Object node = createNodeByType(type);
        if(node == null) {
            Log.w(TAG, "Unknown node type " + type);
            return;
        }

        if(node instanceof View) ((View) node).setId(View.generateViewId());
        nodes.put(id, node);
        nodeProps.put(id, props);

        if(node instanceof View) applyProps((View) node, props);
    }

    private Object createNodeByType(String type) {
        switch(type) {
            case "View":
            case "LinearLayout": {
                LinearLayout layout = new LinearLayout(context);
                layout.setOrientation(LinearLayout.VERTICAL);
                return layout;
            }
            case "FrameLayout":
                return new FrameLayout(context);
            case "RelativeLayout":
                return new RelativeLayout(context);
            case "ScrollView":
                return new ScrollView(context);
            case "HorizontalScrollView":
                return new HorizontalScrollView(context);
            case "PlainView":
                return new View(context);
            case "Text":
            case "TextView":
                return new TextView(context);
            case "EditText":
                return new EditText(context);
            case "Button":
                return new Button(context);
            case "ImageView":
                return new ImageView(context);
            case "ImageButton":
                return new ImageButton(context);
            case "ProgressBar":
                return new ProgressBar(context);
            case "ProgressBarHorizontal":
                return new ProgressBar(context, null, android.R.attr.progressBarStyleHorizontal);
            case "SeekBar":
                return new SeekBar(context);
            case "Switch":
                return new Switch(context);
            case "CheckBox":
                return new CheckBox(context);
            case "RadioButton":
                return new RadioButton(context);
            case "Space":
                return new Space(context);
            default:
                return null;
        }
    }

    private void createText(JSONObject op) throws Exception {
        int id = op.getInt("id");
        nodes.put(id, op.getString("text"));
        nodeProps.put(id, new JSONObject());
    }

    private void appendChild(JSONObject op) throws Exception {
        int parentId = op.getInt("parentId");
        int childId = op.getInt("childId");

        Object parent = nodes.get(parentId);
        Object child = nodes.get(childId);

        if(parent instanceof TextView && child instanceof String) {
            ((TextView) parent).setText((String) child);
            parentByChild.put(childId, parentId);
            return;
        }

        if(parent instanceof ViewGroup && child instanceof View) {
            ViewGroup parentView = (ViewGroup) parent;
            View childView = (View) child;

            if((parentView instanceof ScrollView || parentView instanceof HorizontalScrollView) && parentView.getChildCount() > 0) {
                Log.w(TAG, "Scroll containers only support one direct child. Replacing existing child.");
                parentView.removeAllViews();
            }

            detachFromParent(childView);
            parentView.addView(childView, buildLayoutParams(parentView, childView, getProps(childId)));
            parentByChild.put(childId, parentId);
            applyProps(childView, getProps(childId));
            return;
        }

        Log.w(TAG, "Unsupported appendChild parent=" + parent + " child=" + child);
    }

    private void appendToRoot(JSONObject op) throws Exception {
        int childId = op.getInt("childId");
        Object child = nodes.get(childId);

        if(!(child instanceof View)) {
            Log.w(TAG, "Root child is not a View: " + childId);
            return;
        }

        View childView = (View) child;
        detachFromParent(childView);
        root.addView(childView, buildLayoutParams(root, childView, getProps(childId)));
        parentByChild.put(childId, -1);
        applyProps(childView, getProps(childId));
    }

    private void removeChild(JSONObject op) throws Exception {
        int parentId = op.getInt("parentId");
        int childId = op.getInt("childId");

        Object parent = nodes.get(parentId);
        Object child = nodes.get(childId);

        if(parent instanceof ViewGroup && child instanceof View) {
            ((ViewGroup) parent).removeView((View) child);
            parentByChild.remove(childId);
        }
    }

    private void removeFromRoot(JSONObject op) throws Exception {
        int childId = op.getInt("childId");
        Object child = nodes.get(childId);

        if(child instanceof View) {
            root.removeView((View) child);
            parentByChild.remove(childId);
        }
    }

    private void updateProps(JSONObject op) throws Exception {
        int id = op.getInt("id");
        Object node = nodes.get(id);
        if(!(node instanceof View)) return;

        JSONObject merged = mergeJson(getProps(id), op.optJSONObject("props"));
        nodeProps.put(id, merged);
        applyProps((View) node, merged);
    }

    private void updateText(JSONObject op) throws Exception {
        int id = op.getInt("id");
        String text = op.getString("text");
        Object node = nodes.get(id);

        if(node instanceof String) {
            nodes.put(id, text);

            Integer parentId = parentByChild.get(id);
            if(parentId != null) {
                Object parent = nodes.get(parentId);
                if(parent instanceof TextView) ((TextView) parent).setText(text);
            }
            return;
        }

        if(node instanceof TextView) ((TextView) node).setText(text);
    }

    private void destroyNode(JSONObject op) throws Exception {
        int id = op.getInt("id");
        Object node = nodes.remove(id);
        nodeProps.remove(id);
        parentByChild.remove(id);

        if(node instanceof View) detachFromParent((View) node);
    }

    private void applyProps(View view, JSONObject props) throws Exception {
        applyCommonProps(view, props);

        if(view.getParent() instanceof ViewGroup) {
            view.setLayoutParams(buildLayoutParams((ViewGroup) view.getParent(), view, props));
        }

        if(view instanceof LinearLayout) applyLinearLayoutProps((LinearLayout) view, props);
        if(view instanceof TextView) applyTextViewProps((TextView) view, props);
        if(view instanceof EditText) applyEditTextProps((EditText) view, props);
        if(view instanceof ImageView) applyImageViewProps((ImageView) view, props);
        if(view instanceof ProgressBar) applyProgressBarProps((ProgressBar) view, props);
        if(view instanceof SeekBar) applySeekBarProps((SeekBar) view, props);
        if(view instanceof CompoundButton) applyCompoundButtonProps((CompoundButton) view, props);
        if(view instanceof Switch) applySwitchProps((Switch) view, props);
        if(view instanceof ScrollView) applyScrollViewProps((ScrollView) view, props);
        if(view instanceof HorizontalScrollView) applyHorizontalScrollViewProps((HorizontalScrollView) view, props);
    }

    private void applyCommonProps(View view, JSONObject props) throws Exception {
        if(props.has("visibility")) view.setVisibility(parseVisibility(props.opt("visibility")));
        if(props.has("enabled")) view.setEnabled(parseBoolean(props.opt("enabled"), view.isEnabled()));
        if(props.has("clickable")) view.setClickable(parseBoolean(props.opt("clickable"), view.isClickable()));
        if(props.has("focusable")) view.setFocusable(parseBoolean(props.opt("focusable"), view.isFocusable()));
        if(props.has("focusableInTouchMode")) view.setFocusableInTouchMode(parseBoolean(props.opt("focusableInTouchMode"), view.isFocusableInTouchMode()));
        if(props.has("selected")) view.setSelected(parseBoolean(props.opt("selected"), view.isSelected()));
        if(props.has("activated")) view.setActivated(parseBoolean(props.opt("activated"), view.isActivated()));
        if(props.has("alpha")) view.setAlpha((float) parseDouble(props.opt("alpha"), view.getAlpha()));
        if(props.has("rotation")) view.setRotation((float) parseDouble(props.opt("rotation"), view.getRotation()));
        if(props.has("rotationX")) view.setRotationX((float) parseDouble(props.opt("rotationX"), view.getRotationX()));
        if(props.has("rotationY")) view.setRotationY((float) parseDouble(props.opt("rotationY"), view.getRotationY()));
        if(props.has("scaleX")) view.setScaleX((float) parseDouble(props.opt("scaleX"), view.getScaleX()));
        if(props.has("scaleY")) view.setScaleY((float) parseDouble(props.opt("scaleY"), view.getScaleY()));
        if(props.has("translationX")) view.setTranslationX(parseSize(props.opt("translationX"), (int) view.getTranslationX()));
        if(props.has("translationY")) view.setTranslationY(parseSize(props.opt("translationY"), (int) view.getTranslationY()));
        if(props.has("translationZ")) view.setTranslationZ(parseSize(props.opt("translationZ"), (int) view.getTranslationZ()));
        if(props.has("elevation")) view.setElevation(parseSize(props.opt("elevation"), (int) view.getElevation()));
        if(props.has("minimumWidth")) view.setMinimumWidth(parseSize(props.opt("minimumWidth"), view.getMinimumWidth()));
        if(props.has("minimumHeight")) view.setMinimumHeight(parseSize(props.opt("minimumHeight"), view.getMinimumHeight()));
        if(props.has("contentDescription")) view.setContentDescription(props.optString("contentDescription", null));
        if(props.has("keepScreenOn")) view.setKeepScreenOn(parseBoolean(props.opt("keepScreenOn"), view.getKeepScreenOn()));
        if(props.has("fitsSystemWindows")) view.setFitsSystemWindows(parseBoolean(props.opt("fitsSystemWindows"), view.getFitsSystemWindows()));
        if(props.has("tag")) view.setTag(String.valueOf(props.opt("tag")));
        if(props.has("backgroundColor")) {
            Integer color = parseColor(props.opt("backgroundColor"));
            if(color != null) view.setBackgroundColor(color);
        }
        if(props.has("textAlignment")) view.setTextAlignment(parseTextAlignment(props.optString("textAlignment", "")));

        applyPadding(view, props);
    }

    private void applyPadding(View view, JSONObject props) throws Exception {
        boolean hasAnyPadding =
                props.has("padding") ||
                        props.has("paddingHorizontal") ||
                        props.has("paddingVertical") ||
                        props.has("paddingLeft") ||
                        props.has("paddingTop") ||
                        props.has("paddingRight") ||
                        props.has("paddingBottom");

        if(!hasAnyPadding) return;

        int all = parseSize(props.opt("padding"), -1);
        int horizontal = parseSize(props.opt("paddingHorizontal"), -1);
        int vertical = parseSize(props.opt("paddingVertical"), -1);

        int left = props.has("paddingLeft") ? parseSize(props.opt("paddingLeft"), view.getPaddingLeft()) : (horizontal >= 0 ? horizontal : (all >= 0 ? all : view.getPaddingLeft()));
        int top = props.has("paddingTop") ? parseSize(props.opt("paddingTop"), view.getPaddingTop()) : (vertical >= 0 ? vertical : (all >= 0 ? all : view.getPaddingTop()));
        int right = props.has("paddingRight") ? parseSize(props.opt("paddingRight"), view.getPaddingRight()) : (horizontal >= 0 ? horizontal : (all >= 0 ? all : view.getPaddingRight()));
        int bottom = props.has("paddingBottom") ? parseSize(props.opt("paddingBottom"), view.getPaddingBottom()) : (vertical >= 0 ? vertical : (all >= 0 ? all : view.getPaddingBottom()));

        view.setPadding(left, top, right, bottom);
    }

    private void applyLinearLayoutProps(LinearLayout layout, JSONObject props) throws Exception {
        if(props.has("orientation")) {
            layout.setOrientation("horizontal".equalsIgnoreCase(props.optString("orientation")) ? LinearLayout.HORIZONTAL : LinearLayout.VERTICAL);
        }
        if(props.has("gravity")) layout.setGravity(parseGravity(props.optString("gravity", "")));
        if(props.has("weightSum")) layout.setWeightSum((float) parseDouble(props.opt("weightSum"), layout.getWeightSum()));
        if(props.has("showDividers")) layout.setShowDividers(parseShowDividers(props.opt("showDividers")));
        if(props.has("dividerPadding")) layout.setDividerPadding(parseSize(props.opt("dividerPadding"), layout.getDividerPadding()));
        if(props.has("baselineAligned")) layout.setBaselineAligned(parseBoolean(props.opt("baselineAligned"), layout.isBaselineAligned()));
    }

    private void applyTextViewProps(TextView view, JSONObject props) throws Exception {
        if(props.has("text")) view.setText(String.valueOf(props.opt("text")));
        if(props.has("textColor")) {
            Integer color = parseColor(props.opt("textColor"));
            if(color != null) view.setTextColor(color);
        }
        if(props.has("hint")) view.setHint(String.valueOf(props.opt("hint")));
        if(props.has("hintColor")) {
            Integer color = parseColor(props.opt("hintColor"));
            if(color != null) view.setHintTextColor(color);
        }
        if(props.has("textSizeSp")) view.setTextSize(TypedValue.COMPLEX_UNIT_SP, (float) parseDouble(props.opt("textSizeSp"), 14));
        if(props.has("gravity")) view.setGravity(parseGravity(props.optString("gravity", "")));
        if(props.has("maxLines")) view.setMaxLines(props.optInt("maxLines", Integer.MAX_VALUE));
        if(props.has("minLines")) view.setMinLines(props.optInt("minLines", 1));
        if(props.has("lines")) view.setLines(props.optInt("lines", 1));
        if(props.has("singleLine")) view.setSingleLine(parseBoolean(props.opt("singleLine"), false));
        if(props.has("allCaps")) view.setAllCaps(parseBoolean(props.opt("allCaps"), false));
        if(props.has("includeFontPadding")) view.setIncludeFontPadding(parseBoolean(props.opt("includeFontPadding"), true));
        if(props.has("letterSpacing")) view.setLetterSpacing((float) parseDouble(props.opt("letterSpacing"), view.getLetterSpacing()));
        if(props.has("lineSpacingExtra") || props.has("lineSpacingMultiplier")) {
            float extra = (float) parseDouble(props.opt("lineSpacingExtra"), 0);
            float multiplier = (float) parseDouble(props.opt("lineSpacingMultiplier"), 1);
            view.setLineSpacing(extra, multiplier);
        }
        if(props.has("textStyle")) view.setTypeface(view.getTypeface(), parseTextStyle(props.optString("textStyle", "")));
        if(props.has("ellipsize")) view.setEllipsize(parseEllipsize(props.optString("ellipsize", "")));
        if(props.has("textIsSelectable")) view.setTextIsSelectable(parseBoolean(props.opt("textIsSelectable"), false));
        if(props.has("maxLength")) view.setFilters(new InputFilter[]{new InputFilter.LengthFilter(props.optInt("maxLength", Integer.MAX_VALUE))});
    }

    private void applyEditTextProps(EditText view, JSONObject props) throws Exception {
        if(props.has("inputType")) view.setInputType(parseInputType(props.opt("inputType")));
        if(props.has("imeOptions")) view.setImeOptions(parseImeOptions(props.opt("imeOptions")));
        if(props.has("selectAllOnFocus")) view.setSelectAllOnFocus(parseBoolean(props.opt("selectAllOnFocus"), false));
        if(props.has("cursorVisible")) view.setCursorVisible(parseBoolean(props.opt("cursorVisible"), true));
    }

    private void applyImageViewProps(ImageView view, JSONObject props) throws Exception {
        if(props.has("scaleType")) view.setScaleType(parseScaleType(props.optString("scaleType", "")));
        if(props.has("adjustViewBounds")) view.setAdjustViewBounds(parseBoolean(props.opt("adjustViewBounds"), view.getAdjustViewBounds()));
        if(props.has("tintColor")) {
            Integer color = parseColor(props.opt("tintColor"));
            if(color != null) view.setImageTintList(ColorStateList.valueOf(color));
        }
        if(props.has("imageResource")) {
            Object value = props.opt("imageResource");
            if(value instanceof Number) view.setImageResource(((Number) value).intValue());
        }
    }

    private void applyProgressBarProps(ProgressBar view, JSONObject props) throws Exception {
        if(props.has("indeterminate")) view.setIndeterminate(parseBoolean(props.opt("indeterminate"), view.isIndeterminate()));
        if(props.has("max")) view.setMax(props.optInt("max", view.getMax()));
        if(props.has("progress")) view.setProgress(props.optInt("progress", view.getProgress()));
        if(props.has("secondaryProgress")) view.setSecondaryProgress(props.optInt("secondaryProgress", view.getSecondaryProgress()));
        if(props.has("progressTintColor")) {
            Integer color = parseColor(props.opt("progressTintColor"));
            if(color != null) view.setProgressTintList(ColorStateList.valueOf(color));
        }
    }

    private void applySeekBarProps(SeekBar view, JSONObject props) throws Exception {
        if(props.has("thumbTintColor")) {
            Integer color = parseColor(props.opt("thumbTintColor"));
            if(color != null) view.setThumbTintList(ColorStateList.valueOf(color));
        }
    }

    private void applyCompoundButtonProps(CompoundButton view, JSONObject props) throws Exception {
        if(props.has("checked")) view.setChecked(parseBoolean(props.opt("checked"), view.isChecked()));
        if(props.has("buttonTintColor")) {
            Integer color = parseColor(props.opt("buttonTintColor"));
            if(color != null) view.setButtonTintList(ColorStateList.valueOf(color));
        }
    }

    private void applySwitchProps(Switch view, JSONObject props) throws Exception {
        if(props.has("textOn")) view.setTextOn(String.valueOf(props.opt("textOn")));
        if(props.has("textOff")) view.setTextOff(String.valueOf(props.opt("textOff")));
        if(props.has("showText")) view.setShowText(parseBoolean(props.opt("showText"), view.getShowText()));
        if(props.has("thumbTintColor")) {
            Integer color = parseColor(props.opt("thumbTintColor"));
            if(color != null) view.setThumbTintList(ColorStateList.valueOf(color));
        }
        if(props.has("trackTintColor")) {
            Integer color = parseColor(props.opt("trackTintColor"));
            if(color != null) view.setTrackTintList(ColorStateList.valueOf(color));
        }
    }

    private void applyScrollViewProps(ScrollView view, JSONObject props) throws Exception {
        if(props.has("fillViewport")) view.setFillViewport(parseBoolean(props.opt("fillViewport"), view.isFillViewport()));
        if(props.has("smoothScrollingEnabled")) view.setSmoothScrollingEnabled(parseBoolean(props.opt("smoothScrollingEnabled"), true));
    }

    private void applyHorizontalScrollViewProps(HorizontalScrollView view, JSONObject props) throws Exception {
        if(props.has("fillViewport")) view.setFillViewport(parseBoolean(props.opt("fillViewport"), view.isFillViewport()));
        if(props.has("smoothScrollingEnabled")) view.setSmoothScrollingEnabled(parseBoolean(props.opt("smoothScrollingEnabled"), true));
    }

    private ViewGroup.LayoutParams buildLayoutParams(ViewGroup parent, View child, JSONObject props) throws Exception {
        int width = parseLayoutSize(props.opt("width"), defaultWidth(child));
        int height = parseLayoutSize(props.opt("height"), defaultHeight(child));

        if(parent instanceof LinearLayout) {
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(width, height, (float) parseDouble(props.opt("layoutWeight"), 0));
            applyMargins(lp, props);
            if(props.has("layoutGravity")) lp.gravity = parseGravity(props.optString("layoutGravity", ""));
            return lp;
        }

        if(parent instanceof FrameLayout) {
            FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(width, height);
            applyMargins(lp, props);
            if(props.has("layoutGravity")) lp.gravity = parseGravity(props.optString("layoutGravity", ""));
            return lp;
        }

        if(parent instanceof RelativeLayout) {
            RelativeLayout.LayoutParams lp = new RelativeLayout.LayoutParams(width, height);
            applyMargins(lp, props);
            applyRelativeLayoutRules(lp, props);
            return lp;
        }

        ViewGroup.MarginLayoutParams lp = new ViewGroup.MarginLayoutParams(width, height);
        applyMargins(lp, props);
        return lp;
    }

    private void applyMargins(ViewGroup.MarginLayoutParams lp, JSONObject props) throws Exception {
        boolean hasAnyMargin =
                props.has("margin") ||
                        props.has("marginHorizontal") ||
                        props.has("marginVertical") ||
                        props.has("marginLeft") ||
                        props.has("marginTop") ||
                        props.has("marginRight") ||
                        props.has("marginBottom");

        if(!hasAnyMargin) return;

        int all = parseSize(props.opt("margin"), 0);
        int horizontal = parseSize(props.opt("marginHorizontal"), -1);
        int vertical = parseSize(props.opt("marginVertical"), -1);

        int left = props.has("marginLeft") ? parseSize(props.opt("marginLeft"), lp.leftMargin) : (horizontal >= 0 ? horizontal : all);
        int top = props.has("marginTop") ? parseSize(props.opt("marginTop"), lp.topMargin) : (vertical >= 0 ? vertical : all);
        int right = props.has("marginRight") ? parseSize(props.opt("marginRight"), lp.rightMargin) : (horizontal >= 0 ? horizontal : all);
        int bottom = props.has("marginBottom") ? parseSize(props.opt("marginBottom"), lp.bottomMargin) : (vertical >= 0 ? vertical : all);

        lp.setMargins(left, top, right, bottom);
    }

    private void applyRelativeLayoutRules(RelativeLayout.LayoutParams lp, JSONObject props) throws Exception {
        addRuleIfTrue(lp, props, "alignParentTop", RelativeLayout.ALIGN_PARENT_TOP);
        addRuleIfTrue(lp, props, "alignParentBottom", RelativeLayout.ALIGN_PARENT_BOTTOM);
        addRuleIfTrue(lp, props, "alignParentStart", RelativeLayout.ALIGN_PARENT_START);
        addRuleIfTrue(lp, props, "alignParentEnd", RelativeLayout.ALIGN_PARENT_END);
        addRuleIfTrue(lp, props, "centerInParent", RelativeLayout.CENTER_IN_PARENT);
        addRuleIfTrue(lp, props, "centerHorizontal", RelativeLayout.CENTER_HORIZONTAL);
        addRuleIfTrue(lp, props, "centerVertical", RelativeLayout.CENTER_VERTICAL);

        addAnchorRule(lp, props, "above", RelativeLayout.ABOVE);
        addAnchorRule(lp, props, "below", RelativeLayout.BELOW);
        addAnchorRule(lp, props, "toStartOf", RelativeLayout.START_OF);
        addAnchorRule(lp, props, "toEndOf", RelativeLayout.END_OF);
        addAnchorRule(lp, props, "alignStart", RelativeLayout.ALIGN_START);
        addAnchorRule(lp, props, "alignEnd", RelativeLayout.ALIGN_END);
        addAnchorRule(lp, props, "alignTop", RelativeLayout.ALIGN_TOP);
        addAnchorRule(lp, props, "alignBottom", RelativeLayout.ALIGN_BOTTOM);
    }

    private void addRuleIfTrue(RelativeLayout.LayoutParams lp, JSONObject props, String key, int verb) {
        if(props.has(key) && parseBoolean(props.opt(key), false)) lp.addRule(verb);
    }

    private void addAnchorRule(RelativeLayout.LayoutParams lp, JSONObject props, String key, int verb) {
        if(!props.has(key)) return;

        Object value = props.opt(key);
        if(!(value instanceof Number)) return;

        int anchorNodeId = ((Number) value).intValue();
        Object anchorNode = nodes.get(anchorNodeId);
        if(anchorNode instanceof View) lp.addRule(verb, ((View) anchorNode).getId());
    }

    private JSONObject getProps(int id) {
        JSONObject props = nodeProps.get(id);
        return props != null ? props : new JSONObject();
    }

    private JSONObject copyJson(JSONObject json) throws Exception {
        return json != null ? new JSONObject(json.toString()) : new JSONObject();
    }

    private JSONObject mergeJson(JSONObject base, JSONObject update) throws Exception {
        JSONObject merged = copyJson(base);
        if(update == null) return merged;

        Iterator<String> keys = update.keys();
        while(keys.hasNext()) {
            String key = keys.next();
            Object value = update.get(key);
            if(value == JSONObject.NULL) merged.remove(key);
            else merged.put(key, value);
        }

        return merged;
    }

    private int defaultWidth(View view) {
        return isContainer(view) ? ViewGroup.LayoutParams.MATCH_PARENT : ViewGroup.LayoutParams.WRAP_CONTENT;
    }

    private int defaultHeight(View view) {
        return ViewGroup.LayoutParams.WRAP_CONTENT;
    }

    private boolean isContainer(View view) {
        return view instanceof LinearLayout ||
                view instanceof FrameLayout ||
                view instanceof RelativeLayout ||
                view instanceof ScrollView ||
                view instanceof HorizontalScrollView;
    }

    private int parseLayoutSize(Object value, int fallback) throws Exception {
        if(value == null || value == JSONObject.NULL) return fallback;
        if(value instanceof Number) return dp(((Number) value).floatValue());

        String text = String.valueOf(value).trim().toLowerCase();
        if("match_parent".equals(text) || "match".equals(text) || "fill_parent".equals(text) || "fill".equals(text)) return ViewGroup.LayoutParams.MATCH_PARENT;
        if("wrap_content".equals(text) || "wrap".equals(text)) return ViewGroup.LayoutParams.WRAP_CONTENT;
        if(text.endsWith("dp")) return dp(Float.parseFloat(text.substring(0, text.length() - 2)));
        if(text.endsWith("sp")) return sp(Float.parseFloat(text.substring(0, text.length() - 2)));
        if(text.endsWith("px")) return Math.round(Float.parseFloat(text.substring(0, text.length() - 2)));
        return fallback;
    }

    private int parseSize(Object value, int fallback) {
        try {
            if(value == null || value == JSONObject.NULL) return fallback;
            if(value instanceof Number) return dp(((Number) value).floatValue());

            String text = String.valueOf(value).trim().toLowerCase();
            if(text.endsWith("dp")) return dp(Float.parseFloat(text.substring(0, text.length() - 2)));
            if(text.endsWith("sp")) return sp(Float.parseFloat(text.substring(0, text.length() - 2)));
            if(text.endsWith("px")) return Math.round(Float.parseFloat(text.substring(0, text.length() - 2)));
        } catch(Exception ignored) { }

        return fallback;
    }

    private int dp(float value) {
        return Math.round(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, value, context.getResources().getDisplayMetrics()));
    }

    private int sp(float value) {
        return Math.round(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_SP, value, context.getResources().getDisplayMetrics()));
    }

    private double parseDouble(Object value, double fallback) {
        try {
            if(value == null || value == JSONObject.NULL) return fallback;
            if(value instanceof Number) return ((Number) value).doubleValue();
            return Double.parseDouble(String.valueOf(value));
        } catch(Exception ignored) {
            return fallback;
        }
    }

    private boolean parseBoolean(Object value, boolean fallback) {
        if(value == null || value == JSONObject.NULL) return fallback;
        if(value instanceof Boolean) return (Boolean) value;
        return "true".equalsIgnoreCase(String.valueOf(value));
    }

    private Integer parseColor(Object value) {
        try {
            if(value == null || value == JSONObject.NULL) return null;
            if(value instanceof Number) return ((Number) value).intValue();
            return Color.parseColor(String.valueOf(value));
        } catch(Exception e) {
            Log.w(TAG, "Failed to parse color " + value);
            return null;
        }
    }

    private int parseVisibility(Object value) {
        String text = String.valueOf(value).toLowerCase();
        if("gone".equals(text)) return View.GONE;
        if("invisible".equals(text)) return View.INVISIBLE;
        return View.VISIBLE;
    }

    private int parseTextAlignment(String value) {
        switch(value.toLowerCase()) {
            case "center":
                return View.TEXT_ALIGNMENT_CENTER;
            case "textstart":
            case "start":
                return View.TEXT_ALIGNMENT_TEXT_START;
            case "textend":
            case "end":
                return View.TEXT_ALIGNMENT_TEXT_END;
            case "viewstart":
                return View.TEXT_ALIGNMENT_VIEW_START;
            case "viewend":
                return View.TEXT_ALIGNMENT_VIEW_END;
            default:
                return View.TEXT_ALIGNMENT_INHERIT;
        }
    }

    private int parseGravity(String value) {
        if(value == null || value.isEmpty()) return Gravity.NO_GRAVITY;

        int gravity = 0;
        String[] parts = value.toLowerCase().split("\\|");

        for(String rawPart : parts) {
            String part = rawPart.trim();
            switch(part) {
                case "center":
                    gravity |= Gravity.CENTER;
                    break;
                case "center_horizontal":
                case "centerhorizontal":
                    gravity |= Gravity.CENTER_HORIZONTAL;
                    break;
                case "center_vertical":
                case "centervertical":
                    gravity |= Gravity.CENTER_VERTICAL;
                    break;
                case "start":
                    gravity |= Gravity.START;
                    break;
                case "end":
                    gravity |= Gravity.END;
                    break;
                case "left":
                    gravity |= Gravity.LEFT;
                    break;
                case "right":
                    gravity |= Gravity.RIGHT;
                    break;
                case "top":
                    gravity |= Gravity.TOP;
                    break;
                case "bottom":
                    gravity |= Gravity.BOTTOM;
                    break;
            }
        }

        return gravity;
    }

    private int parseShowDividers(Object value) {
        if(value == null || value == JSONObject.NULL) return LinearLayout.SHOW_DIVIDER_NONE;
        String[] parts = String.valueOf(value).toLowerCase().split("\\|");
        int result = LinearLayout.SHOW_DIVIDER_NONE;

        for(String rawPart : parts) {
            String part = rawPart.trim();
            switch(part) {
                case "beginning":
                    result |= LinearLayout.SHOW_DIVIDER_BEGINNING;
                    break;
                case "middle":
                    result |= LinearLayout.SHOW_DIVIDER_MIDDLE;
                    break;
                case "end":
                    result |= LinearLayout.SHOW_DIVIDER_END;
                    break;
            }
        }

        return result;
    }

    private int parseTextStyle(String value) {
        if(value == null || value.isEmpty()) return android.graphics.Typeface.NORMAL;

        int style = android.graphics.Typeface.NORMAL;
        String[] parts = value.toLowerCase().split("\\|");

        for(String rawPart : parts) {
            String part = rawPart.trim();
            if("bold".equals(part)) style |= android.graphics.Typeface.BOLD;
            if("italic".equals(part)) style |= android.graphics.Typeface.ITALIC;
        }

        return style;
    }

    private TextUtils.TruncateAt parseEllipsize(String value) {
        switch(value.toLowerCase()) {
            case "start":
                return TextUtils.TruncateAt.START;
            case "middle":
                return TextUtils.TruncateAt.MIDDLE;
            case "marquee":
                return TextUtils.TruncateAt.MARQUEE;
            case "end":
            default:
                return TextUtils.TruncateAt.END;
        }
    }

    private ImageView.ScaleType parseScaleType(String value) {
        switch(value.toLowerCase()) {
            case "center":
                return ImageView.ScaleType.CENTER;
            case "center_crop":
            case "centercrop":
                return ImageView.ScaleType.CENTER_CROP;
            case "center_inside":
            case "centerinside":
                return ImageView.ScaleType.CENTER_INSIDE;
            case "fit_start":
            case "fitstart":
                return ImageView.ScaleType.FIT_START;
            case "fit_end":
            case "fitend":
                return ImageView.ScaleType.FIT_END;
            case "fit_xy":
            case "fitxy":
                return ImageView.ScaleType.FIT_XY;
            case "fit_center":
            case "fitcenter":
            default:
                return ImageView.ScaleType.FIT_CENTER;
        }
    }

    private int parseInputType(Object value) {
        if(value instanceof Number) return ((Number) value).intValue();
        if(value == null || value == JSONObject.NULL) return InputType.TYPE_CLASS_TEXT;

        int result = 0;
        String[] parts = String.valueOf(value).toLowerCase().split("\\|");

        for(String rawPart : parts) {
            String part = rawPart.trim();
            switch(part) {
                case "text":
                    result |= InputType.TYPE_CLASS_TEXT;
                    break;
                case "textmultiline":
                case "multiline":
                    result |= InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_MULTI_LINE;
                    break;
                case "textpassword":
                case "password":
                    result |= InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD;
                    break;
                case "email":
                    result |= InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS;
                    break;
                case "number":
                    result |= InputType.TYPE_CLASS_NUMBER;
                    break;
                case "decimal":
                    result |= InputType.TYPE_CLASS_NUMBER | InputType.TYPE_NUMBER_FLAG_DECIMAL;
                    break;
                case "phone":
                    result |= InputType.TYPE_CLASS_PHONE;
                    break;
            }
        }

        return result != 0 ? result : InputType.TYPE_CLASS_TEXT;
    }

    private int parseImeOptions(Object value) {
        if(value instanceof Number) return ((Number) value).intValue();
        if(value == null || value == JSONObject.NULL) return 0;

        int result = 0;
        String[] parts = String.valueOf(value).toLowerCase().split("\\|");

        for(String rawPart : parts) {
            String part = rawPart.trim();
            switch(part) {
                case "actiondone":
                case "done":
                    result |= EditorInfo.IME_ACTION_DONE;
                    break;
                case "actiongo":
                case "go":
                    result |= EditorInfo.IME_ACTION_GO;
                    break;
                case "actionnext":
                case "next":
                    result |= EditorInfo.IME_ACTION_NEXT;
                    break;
                case "actionsearch":
                case "search":
                    result |= EditorInfo.IME_ACTION_SEARCH;
                    break;
                case "actionsend":
                case "send":
                    result |= EditorInfo.IME_ACTION_SEND;
                    break;
            }
        }

        return result;
    }

    private void detachFromParent(View view) {
        if(view.getParent() instanceof ViewGroup) {
            ((ViewGroup) view.getParent()).removeView(view);
        }
    }
}
