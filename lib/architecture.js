// PHP block examples from the user's actual codebase
export const PHP_EXAMPLES = `
ARQUITECTURA DE BLOQUES PHP — REGLAS EXACTAS A SEGUIR:

1. PATRÓN DE CAMPOS ACF:
   - Los campos se leen con get_sub_field('nombre_campo') dentro de flexible content o repeater
   - Para imágenes: $image = get_sub_field('image'); luego $image['url'] y $image['alt']
   - Para repeaters: while(have_rows('items')):the_row(); ... the_sub_field('campo'); ... endwhile;
   - Para post objects: $items = get_sub_field("posts"); foreach($items as $post): setup_postdata($post);

2. PATRÓN PHP DE BLOQUES (usa EXACTAMENTE este estilo):
   - <section class="nombre-bloque"> como contenedor raíz
   - <div class="container"> envuelve el contenido
   - BEM estricto: bloque__elemento y bloque__elemento--modificador
   - Condicionales antes de cada campo: <?php if(get_sub_field('campo')):?> ... <?php endif;?>
   - Para echo inline: <?php echo (get_sub_field('campo') ? '<tag class="...">'.get_sub_field('campo').'</tag>' : '') ?>
   - Botones dentro de: <div class="button-container flex-row flex-row--wrap"> <a href="..." class="button">texto</a> </div>
   - Clases helper: flex-row, flex-row--space, flex-row--wrap, flex-row--vcenter, flex-row--center
   - Títulos principales: class="section-title", subtítulos: class="section-subtitle"
   - Alineado centro: añadir class "align-center"

3. EJEMPLO banner.php:
<?php 
    $banner = isset($args['banner']) ? $args['banner'] : false;
    $title = !$banner ? get_sub_field('title') : $banner['title'];
    $subtitle = !$banner ? get_sub_field('subtitle') : $banner['subtitle'];
    $button_text = !$banner ? get_sub_field('button_text') : $banner['button_text'];
    $button_link = !$banner ? get_sub_field('button_link') : $banner['button_link'];
?>
<section class="banner">
    <div class="container">
        <div class="banner__box">
            <?php echo $title != "" ? '<h2 class="banner__title section-title align-center">'.$title.'</h2>' : '' ?>
            <?php echo $subtitle != "" ? '<p class="banner__text section-subtitle align-center">'.$subtitle.'</p>' : '' ?>
            <?php if($button_text != ''):?>
                <div class="banner__button-container button-container flex-row flex-row--center">
                    <a href="<?php echo $button_link ?>" class="banner_button button"><?php echo $button_text ?></a>
                </div>
            <?php endif;?>
        </div>
    </div>
</section>

4. EJEMPLO faqs.php:
<section class="faqs">
    <div class="container">
        <?php if(get_sub_field('title')):?>
            <h2 class="faqs__title section-title"><?php the_sub_field('title')?></h2>
        <?php endif;?>
        <?php if(get_sub_field('subtitle')):?>
            <p class="faqs__subtitle section-subtitle"><?php the_sub_field('subtitle')?></p>
        <?php endif;?>
        <div class="faqs__questions-container">
            <?php while(have_rows('questions')):the_row();?>
                <div class="faqs__question">
                    <p class="faqs__question-title"><?php the_sub_field('question')?></p>
                    <div class="faqs__question-text"><?php the_sub_field('answer')?></div>
                </div>
            <?php endwhile;?>
        </div>
    </div>
</section>

5. EJEMPLO hero-shot.php:
<section class="hero-shot">
    <div class="container flex-row flex-row--space flex-row--wrap flex-row--vcenter">
        <div class="hero-shot__text-container">
            <?php echo (get_sub_field('page_name') ? '<p class="pre-title">'.get_sub_field('page_name').'</p>' : '' )?>
            <?php echo (get_sub_field('title') ? '<h1 class="page-title">'.get_sub_field('title').'</h1>' : '' )?>
            <?php echo (get_sub_field('subtitle') ? '<p class="page-subtitle">'.get_sub_field('subtitle').'</p>' : '' )?>
            <?php if(get_sub_field('button_link')): ?>
                <div class="button-container flex-row flex-row--wrap">
                    <a href="<?php the_sub_field( 'button_link' ); ?>" class="button"><?php the_sub_field( 'button_text' ); ?></a>
                </div>
            <?php endif; ?>
        </div>
        <div class="hero-shot__image">
            <?php $image = get_sub_field('image'); ?>
            <img src="<?php echo $image['url']?>" alt="<?php echo $image['alt']?>" />
        </div>
    </div>
</section>

6. EJEMPLO logo-row.php:
<section class="logo-row<?php echo get_sub_field('animation') == 'horizontalScroll' ? ' logo-row--scrolled' : '' ?>">
    <?php if (get_sub_field( 'title' ) ) : ?>
        <p class="logo-row__title container"><?php the_sub_field( 'title' ); ?></p>
    <?php endif; ?>
    <?php $logos = get_sub_field('logos');?>
    <?php if($logos):?> 
        <div class="logo-row__container flex-row">
            <?php foreach($logos as $image): ?>
                <div class="logo-row__logo-container">
                    <img class="logo-row__logo" src="<?php echo $image['url']?>" alt="<?php echo $image['alt']?>"/>
                </div>
            <?php endforeach;?>
        </div>
    <?php endif;?>
</section>

7. EJEMPLO testimonials.php:
<section class="testimonials">
    <div class="container">
        <?php echo (get_sub_field('title') ? '<h2 class="section-title align-center">'.get_sub_field('title').'</h2>' : '' )?>
        <?php echo (get_sub_field('subtitle') ? '<p class="section-subtitle align-center">'.get_sub_field('subtitle').'</p>' : '' )?>
        <?php $items = get_sub_field("testimonials");?>
        <?php if( $items ): ?>
            <div class="splide testimonials__slider">
                <?php foreach( $items as $post ): setup_postdata($post); ?>
                    <div>
                        <p class="testimonials__quote"><?php echo get_field('quote')?></p>
                        <div class="testimonials__author">
                            <p class="testimonials__author-name"><?php echo get_field('author_name')?></p>
                            <p class="testimonials__author-role"><?php echo get_field('author_role')?></p>
                        </div>
                    </div>
                <?php endforeach; wp_reset_postdata(); ?>
            </div>
        <?php endif; ?>
    </div>
</section>

8. FORMATO JSON ACF — estructura exacta de field group:
{
  "key": "group_XXXXXXXX",
  "title": "Section - NombreBloque",
  "fields": [
    { "key": "field_XXXXXXXX", "label": "Title", "name": "title", "type": "text" },
    { "key": "field_XXXXXXXX", "label": "Subtitle", "name": "subtitle", "type": "textarea" },
    { "key": "field_XXXXXXXX", "label": "Button Text", "name": "button_text", "type": "text" },
    { "key": "field_XXXXXXXX", "label": "Button Link", "name": "button_link", "type": "url" },
    { "key": "field_XXXXXXXX", "label": "Image", "name": "image", "type": "image" },
    { "key": "field_XXXXXXXX", "label": "Items", "name": "items", "type": "repeater", "sub_fields": [
      { "key": "field_XXXXXXXX", "label": "Text", "name": "text", "type": "text" }
    ]}
  ],
  "location": [[ { "param": "post_type", "operator": "==", "value": "page" } ]],
  "menu_order": 0,
  "position": "normal",
  "style": "default",
  "label_placement": "top",
  "instruction_placement": "label"
}
`;

export const DETECT_SYSTEM = `Eres un experto en analizar webs y detectar secciones de contenido para WordPress + ACF.
Responde SOLO con el JSON array solicitado, sin markdown, sin explicación, sin bloques de código.`;

export const GENERATE_SYSTEM = `Eres un experto en WordPress, ACF y PHP. 
Sigues EXACTAMENTE los patrones de código dados como ejemplos.
Responde SOLO con el JSON solicitado, sin markdown, sin bloques de código, sin explicación.`;
